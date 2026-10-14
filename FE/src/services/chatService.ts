import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type {
  ChatConversation,
  ChatMessage,
  ChatMessagePage,
  ChatReadResult,
  ConversationPage,
} from "../types/chat";

export const CHAT_FILE_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,application/pdf,text/plain";
export function validateChatFile(file: File): string | null {
  if (!CHAT_FILE_ACCEPT.split(",").includes(file.type)) return "Chọn ảnh JPG/PNG/WebP, video MP4 hoặc tài liệu PDF/TXT.";
  const limit = file.type === "video/mp4" ? 50 : 10;
  return !file.size || file.size > limit * 1024 * 1024 ? `Tệp phải có dữ liệu và không quá ${limit} MB.` : null;
}
export const chatService = {
  async unreadCount(): Promise<number> { return (await api.get<ApiResponse<{ count: number }>>("/conversations/unread-count")).data.result.count; },
  async online(): Promise<string[]> { return (await api.get<ApiResponse<string[]>>("/conversations/presence")).data.result; },
  async heart(conversationId: string, messageId: string, liked: boolean): Promise<ChatMessage> {
    return (await api.put<ApiResponse<ChatMessage>>(`/conversations/${conversationId}/messages/${messageId}/heart`, { liked })).data.result;
  },
  async send(conversationId: string, clientMessageId: string, content: string, file?: File, onProgress?: (percent: number) => void): Promise<ChatMessage> {
    if (!file) return (await api.post<ApiResponse<ChatMessage>>(`/conversations/${conversationId}/messages`, { clientMessageId, content })).data.result;
    const form = new FormData(); form.append("clientMessageId", clientMessageId); form.append("content", content); form.append("file", file);
    return (await api.post<ApiResponse<ChatMessage>>(`/conversations/${conversationId}/messages`, form, {
      headers: { "Content-Type": undefined }, timeout: 300000,
      onUploadProgress: event => { if (event.total) onProgress?.(Math.round(event.loaded * 100 / event.total)); },
    })).data.result;
  },
  async attachment(url: string): Promise<Blob> { return (await api.get<Blob>(url, { responseType: "blob", timeout: 300000 })).data; },
  async getConversations(page = 0, size = 20): Promise<ConversationPage> {
    const response = await api.get<ApiResponse<ConversationPage>>("/conversations", {
      params: { page, size },
    });
    return response.data.result;
  },

  async getConversation(conversationId: string): Promise<ChatConversation> {
    const response = await api.get<ApiResponse<ChatConversation>>(`/conversations/${conversationId}`);
    return response.data.result;
  },

  async openMatchConversation(matchId: string): Promise<ChatConversation> {
    const response = await api.post<ApiResponse<ChatConversation>>(`/conversations/matches/${matchId}`);
    return response.data.result;
  },

  async getMessages(conversationId: string, page = 0, size = 50): Promise<ChatMessagePage> {
    const response = await api.get<ApiResponse<ChatMessagePage>>(`/conversations/${conversationId}/messages`, {
      params: { page, size },
    });
    return response.data.result;
  },

  async markRead(conversationId: string): Promise<ChatReadResult> {
    const response = await api.post<ApiResponse<ChatReadResult>>(`/conversations/${conversationId}/read`);
    return response.data.result;
  },
};
