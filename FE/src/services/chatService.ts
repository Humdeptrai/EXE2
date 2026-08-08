import api from "../config/axios";
import type { ApiResponse } from "../types/api";
import type {
  ChatConversation,
  ChatMessagePage,
  ChatReadResult,
  ConversationPage,
} from "../types/chat";

export const chatService = {
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
