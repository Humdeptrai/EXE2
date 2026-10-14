import { env } from "../config/env";
import type { ChatSendPayload, ChatSocketError, ChatSocketEvent } from "../types/chat";
import { tokenService } from "./tokenService";

export type ChatSocketStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

interface ChatSocketCallbacks {
  onMessage?: (event: ChatSocketEvent) => void;
  onError?: (error: ChatSocketError) => void;
  onStatusChange?: (status: ChatSocketStatus) => void;
}

interface ParsedFrame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

function parseFrame(rawFrame: string): ParsedFrame | null {
  const cleaned = rawFrame.replace(/\r\n/g, "\n").replace(/^\n+/, "");
  if (!cleaned.trim()) return null;
  const separatorIndex = cleaned.indexOf("\n\n");
  const headerBlock = separatorIndex >= 0 ? cleaned.slice(0, separatorIndex) : cleaned;
  const body = separatorIndex >= 0 ? cleaned.slice(separatorIndex + 2) : "";
  const lines = headerBlock.split("\n");
  const command = lines.shift()?.trim() || "";
  if (!command) return null;
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const splitAt = line.indexOf(":");
    if (splitAt <= 0) continue;
    const key = line.slice(0, splitAt);
    const value = line
        .slice(splitAt + 1)
        .replace(/\\n/g, "\n")
        .replace(/\\c/g, ":")
        .replace(/\\\\/g, "\\");
    headers[key] = value;
  }
  return { command, headers, body };
}

function frame(command: string, headers: Record<string, string>, body = "") {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${headerLines.join("\n")}\n\n${body}\0`;
}

export class ChatSocketConnection {
  private socket: WebSocket | null = null;
  private heartbeat: number | null = null;
  private lastReceived = 0;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private manualClose = false;
  private buffer = "";
  private status: ChatSocketStatus = "DISCONNECTED";

  constructor(private readonly callbacks: ChatSocketCallbacks = {}) {}

  connect() {
    this.manualClose = false;
    this.reconnectAttempts = 0;
    this.openSocket();
  }

  disconnect() {
    this.manualClose = true;
    if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(frame("DISCONNECT", { receipt: crypto.randomUUID() }));
    }
    socket?.close();
    this.updateStatus("DISCONNECTED");
  }

  sendMessage(payload: ChatSendPayload): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.status !== "CONNECTED") {
      return false;
    }
    this.socket.send(frame(
        "SEND",
        {
          destination: "/app/chat.send",
          "content-type": "application/json",
        },
        JSON.stringify(payload),
    ));
    return true;
  }

  getStatus() {
    return this.status;
  }

  private openSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    const accessToken = tokenService.getAccessToken();
    if (!accessToken) {
      this.callbacks.onError?.({ code: 40103, message: "Phiên đăng nhập đã hết hạn." });
      this.updateStatus("DISCONNECTED");
      return;
    }

    this.updateStatus("CONNECTING");
    const socket = new WebSocket(env.WS_URL);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket || this.manualClose) return;
      const host = (() => {
        try {
          return new URL(env.WS_URL).host;
        } catch {
          return window.location.host;
        }
      })();
      socket.send(frame("CONNECT", {
        "accept-version": "1.2",
        host,
        "heart-beat": "10000,10000",
        Authorization: `Bearer ${accessToken}`,
      }));
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket || this.manualClose) return;
      this.lastReceived = Date.now();
      void this.consume(event.data);
    };

    socket.onerror = () => {
      if (this.socket !== socket || this.manualClose) return;
      this.callbacks.onError?.({ code: 50000, message: "Kết nối realtime đang gặp sự cố." });
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
      this.heartbeat = null;
      this.updateStatus("DISCONNECTED");
      if (!this.manualClose) this.scheduleReconnect();
    };
  }

  private async consume(data: unknown) {
    const text = typeof data === "string"
        ? data
        : data instanceof Blob
            ? await data.text()
            : "";
    if (!text.trim()) return;
    this.buffer += text;
    const chunks = this.buffer.split("\0");
    this.buffer = chunks.pop() || "";
    for (const chunk of chunks) {
      const parsed = parseFrame(chunk);
      if (parsed) this.handleFrame(parsed);
    }
  }

  private handleFrame(parsed: ParsedFrame) {
    if (parsed.command === "CONNECTED") {
      this.reconnectAttempts = 0;
      this.lastReceived = Date.now();
      if (this.heartbeat !== null) window.clearInterval(this.heartbeat);
      this.heartbeat = window.setInterval(() => {
        if (this.socket?.readyState !== WebSocket.OPEN) return;
        if (Date.now() - this.lastReceived > 45000) { this.socket.close(); return; }
        this.socket.send("\n");
      }, 10000);
      this.updateStatus("CONNECTED");
      this.socket?.send(frame("SUBSCRIBE", {
        id: "handsfree-chat-events",
        destination: "/user/queue/chat",
        ack: "auto",
      }));
      this.socket?.send(frame("SUBSCRIBE", {
        id: "handsfree-chat-errors",
        destination: "/user/queue/chat-errors",
        ack: "auto",
      }));
      return;
    }

    if (parsed.command === "MESSAGE") {
      const destination = parsed.headers.destination || "";
      try {
        if (destination.endsWith("/chat-errors")) {
          this.callbacks.onError?.(JSON.parse(parsed.body) as ChatSocketError);
        } else {
          this.callbacks.onMessage?.(JSON.parse(parsed.body) as ChatSocketEvent);
        }
      } catch {
        this.callbacks.onError?.({ code: 50000, message: "Không thể đọc dữ liệu realtime." });
      }
      return;
    }

    if (parsed.command === "ERROR") {
      this.callbacks.onError?.({
        code: 40103,
        message: parsed.headers.message || parsed.body || "Không thể xác thực kết nối realtime.",
      });
      this.socket?.close();
    }
  }

  private scheduleReconnect() {
    if (this.manualClose || this.reconnectTimer !== null) return;
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, Math.min(2_000 * this.reconnectAttempts, 30_000));
  }

  private updateStatus(status: ChatSocketStatus) {
    if (this.status === status) return;
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }
}