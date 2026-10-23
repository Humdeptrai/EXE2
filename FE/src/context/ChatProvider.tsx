import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { useAuth } from "./AuthContext";
import { ChatContext } from "./ChatContext";
import { chatService } from "../services/chatService";
import { ChatSocketConnection, type ChatSocketStatus } from "../services/chatSocketService";
import type { ChatSocketEvent } from "../types/chat";
export function ChatProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  return <UserChat key={user?.id ?? "guest"} userId={user?.role === "USER" ? user.id : null}>{children}</UserChat>;
}
function UserChat({ children, userId }: PropsWithChildren<{ userId: string | null }>) {
  const [unreadCount, setUnread] = useState(0);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [socketStatus, setStatus] = useState<ChatSocketStatus>("DISCONNECTED");
  const listeners = useRef(new Set<(event: ChatSocketEvent) => void>());
  const generation = useRef(0);
  const unreadRequest = useRef(false);
  const refreshUnread = useCallback(async () => {
    if (!userId || unreadRequest.current) return;
    unreadRequest.current = true;
    const current = generation.current;
    try { const count = await chatService.unreadCount(); if (current === generation.current) setUnread(count); } catch { /* Preserve badge on network failure. */ }
    finally { unreadRequest.current = false; }
  }, [userId]);
  useEffect(() => {
    const current = ++generation.current;
    if (!userId) return;
    let presenceVersion = 0;
    const refreshPresence = async () => {
      const version = presenceVersion;
      try { const users = await chatService.online(); if (current === generation.current && version === presenceVersion) setOnline(new Set(users)); } catch { /* Realtime or next refresh will recover. */ }
    };
    const socket = new ChatSocketConnection({
      onMessage: event => {
        if (current !== generation.current) return;
        if (event.type === "PRESENCE") { presenceVersion++; setOnline(previous => { const next = new Set(previous); if (event.online) next.add(event.userId); else next.delete(event.userId); return next; }); }
        else if (event.type === "MESSAGE" || event.type === "READ") void refreshUnread();
        for (const listener of listeners.current) listener(event);
      },
      onStatusChange: status => {
        if (current !== generation.current) return;
        setStatus(status);
        if (status === "CONNECTED") { void refreshUnread(); void refreshPresence(); }
        else setOnline(new Set());
      },
    });
    socket.connect();
    const initialRefresh = window.setTimeout(() => void refreshUnread(), 0);
    const refresh = () => { if (document.visibilityState === "visible") { void refreshUnread(); if (socket.getStatus() === "CONNECTED") void refreshPresence(); } };
    let lastRefresh = Date.now();
    const fallback = () => {
      const interval = socket.getStatus() === "CONNECTED" ? 60000 : 15000;
      if (Date.now() - lastRefresh >= interval) { lastRefresh = Date.now(); refresh(); }
    };
    const timer = window.setInterval(fallback, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { generation.current++; window.clearTimeout(initialRefresh); socket.disconnect(); window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [userId, refreshUnread]);
  const subscribe = useCallback((listener: (event: ChatSocketEvent) => void) => { listeners.current.add(listener); return () => { listeners.current.delete(listener); }; }, []);
  const value = useMemo(() => ({ unreadCount, online, socketStatus, refreshUnread, subscribe }), [unreadCount, online, socketStatus, refreshUnread, subscribe]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
