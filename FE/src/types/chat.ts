import type { MatchStatus, MatchUser } from "./matching";
import type { PageResponse } from "./job";

export interface ChatConversation {
  id: string;
  matchId: string;
  jobId: string;
  jobTitle: string;
  counterpart: MatchUser;
  matchStatus: MatchStatus;
  chatUnlocked: boolean;
  canSend: boolean;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string | null;
  content: string;
  sentAt: string;
  readAt: string | null;
  attachment?: { name: string; contentType: string; sizeBytes: number; url: string } | null;
  hearts?: string[];
}

export interface ChatReadResult {
  conversationId: string;
  markedRead: number;
}

export type ChatSocketEvent =
  | { type: "MESSAGE" | "MESSAGE_UPDATED"; message: ChatMessage; conversationId: string }
  | { type: "READ"; conversationId: string; userId: string }
  | { type: "PRESENCE"; userId: string; online: boolean };

export interface ChatSocketError {
  code: number;
  message: string;
}

export interface ChatSendPayload {
  conversationId: string;
  clientMessageId: string;
  content: string;
}

export type ConversationPage = PageResponse<ChatConversation>;
export type ChatMessagePage = PageResponse<ChatMessage>;
