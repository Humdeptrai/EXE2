import { createContext, useContext } from "react";
import type { ChatSocketEvent } from "../types/chat";
import type { ChatSocketStatus } from "../services/chatSocketService";
export interface ChatContextValue {
  unreadCount: number; online: ReadonlySet<string>; socketStatus: ChatSocketStatus;
  refreshUnread: () => Promise<void>;
  subscribe: (listener: (event: ChatSocketEvent) => void) => () => void;
}
export const ChatContext = createContext<ChatContextValue | null>(null);
export function useChat() { const value = useContext(ChatContext); if (!value) throw new Error("ChatProvider missing"); return value; }
