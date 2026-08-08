import { env } from "../config/env";
import type { NotificationItem } from "../types/notification";
import { tokenService } from "./tokenService";

export type NotificationSocketStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

interface NotificationSocketCallbacks {
  onNotification?: (notification: NotificationItem) => void;
  onStatusChange?: (status: NotificationSocketStatus) => void;
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
    headers[line.slice(0, splitAt)] = line.slice(splitAt + 1)
      .replace(/\\n/g, "\n")
      .replace(/\\c/g, ":")
      .replace(/\\\\/g, "\\");
  }
  return { command, headers, body };
}

function frame(command: string, headers: Record<string, string>, body = "") {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`);
  return `${command}\n${headerLines.join("\n")}\n\n${body}\0`;
}

export class NotificationSocketConnection {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private manualClose = false;
  private buffer = "";
  private status: NotificationSocketStatus = "DISCONNECTED";

  constructor(private readonly callbacks: NotificationSocketCallbacks = {}) {}

  connect() {
    this.manualClose = false;
    this.openSocket();
  }

  disconnect() {
    this.manualClose = true;
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

  private openSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;
    const accessToken = tokenService.getAccessToken();
    if (!accessToken) {
      this.updateStatus("DISCONNECTED");
      return;
    }

    this.updateStatus("CONNECTING");
    const socket = new WebSocket(env.WS_URL);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket || this.manualClose) return;
      const host = (() => {
        try { return new URL(env.WS_URL).host; } catch { return window.location.host; }
      })();
      socket.send(frame("CONNECT", {
        "accept-version": "1.2",
        host,
        "heart-beat": "0,0",
        Authorization: `Bearer ${accessToken}`,
      }));
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket || this.manualClose) return;
      void this.consume(event.data);
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.updateStatus("DISCONNECTED");
      if (!this.manualClose) this.scheduleReconnect();
    };
  }

  private async consume(data: unknown) {
    const text = typeof data === "string" ? data : data instanceof Blob ? await data.text() : "";
    if (!text) return;
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
      this.updateStatus("CONNECTED");
      this.socket?.send(frame("SUBSCRIBE", {
        id: "handsfree-notifications",
        destination: "/user/queue/notifications",
        ack: "auto",
      }));
      return;
    }
    if (parsed.command === "MESSAGE" && (parsed.headers.destination || "").endsWith("/notifications")) {
      try {
        this.callbacks.onNotification?.(JSON.parse(parsed.body) as NotificationItem);
      } catch {
        // Ignore malformed realtime payloads; REST remains the source of truth.
      }
      return;
    }
    if (parsed.command === "ERROR") {
      socketSafeClose(this.socket);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= 5 || this.reconnectTimer !== null) return;
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, Math.min(2_000 * this.reconnectAttempts, 8_000));
  }

  private updateStatus(status: NotificationSocketStatus) {
    if (this.status === status) return;
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }
}

function socketSafeClose(socket: WebSocket | null) {
  try { socket?.close(); } catch { /* no-op */ }
}
