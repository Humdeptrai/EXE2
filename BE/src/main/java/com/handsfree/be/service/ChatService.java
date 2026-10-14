package com.handsfree.be.service;

import com.handsfree.be.dto.request.ChatSendMessageRequest;
import com.handsfree.be.dto.response.ChatConversationResponse;
import com.handsfree.be.dto.response.ChatMessageResponse;
import com.handsfree.be.dto.response.ChatReadResponse;
import com.handsfree.be.dto.response.PageResponse;

import java.util.UUID;

public interface ChatService {
    PageResponse<ChatConversationResponse> getConversations(UUID currentUserId, int page, int size);

    ChatConversationResponse getConversation(UUID currentUserId, UUID conversationId);

    ChatConversationResponse getOrCreateConversation(UUID currentUserId, UUID matchId);

    PageResponse<ChatMessageResponse> getMessages(UUID currentUserId, UUID conversationId, int page, int size);

    ChatReadResponse markRead(UUID currentUserId, UUID conversationId);

    long unreadCount(UUID currentUserId);
    ChatMessageResponse heart(UUID currentUserId, UUID conversationId, UUID messageId, boolean liked);
    ChatMessageResponse sendAttachment(UUID currentUserId, UUID conversationId, UUID clientMessageId, String content,
            org.springframework.web.multipart.MultipartFile file);
    com.handsfree.be.storage.PrivateChatFile attachment(UUID currentUserId, UUID conversationId, UUID messageId);

    ChatMessageDelivery sendMessage(UUID currentUserId, ChatSendMessageRequest request);
}
