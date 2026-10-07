package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.request.ChatSendMessageRequest;
import com.handsfree.be.dto.response.ChatConversationResponse;
import com.handsfree.be.dto.response.ChatMessageResponse;
import com.handsfree.be.dto.response.ChatReadResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.ChatConversation;
import com.handsfree.be.entity.ChatMessage;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.ChatMapper;
import com.handsfree.be.repository.ChatConversationRepository;
import com.handsfree.be.repository.ChatMessageRepository;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.service.ChatMessageDelivery;
import com.handsfree.be.service.ChatService;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private static final int MAX_MESSAGE_LENGTH = 2_000;
    private static final int MAX_PREVIEW_LENGTH = 160;

    private final ContactAccess contactAccess;
    private final AccountAccess accountAccess;
    private final JobMatchRepository jobMatchRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMapper chatMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public PageResponse<ChatConversationResponse> getConversations(UUID currentUserId, int page, int size) {
        accountAccess.active(currentUserId);
        backfillUnlockedConversations(currentUserId);
        Page<ChatConversationResponse> result = chatConversationRepository
                .findAllForParticipant(currentUserId, pageRequest(page, size))
                .map(conversation -> chatMapper.toConversationResponse(
                        conversation,
                        currentUserId,
                        chatMessageRepository.countUnread(
                                conversation.getId(),
                                currentUserId
                        )
                ));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatConversationResponse getConversation(UUID currentUserId, UUID conversationId) {
        ChatConversation conversation = requireParticipantConversation(currentUserId, conversationId);
        long unread = chatMessageRepository.countUnread(
                conversationId,
                currentUserId
        );
        return chatMapper.toConversationResponse(conversation, currentUserId, unread);
    }

    @Override
    @Transactional
    public ChatConversationResponse getOrCreateConversation(UUID currentUserId, UUID matchId) {
        JobMatch match = jobMatchRepository.findParticipantMatchForUpdate(matchId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        requireChatUnlocked(match);

        ChatConversation conversation = chatConversationRepository.findByJobMatch_Id(matchId)
                .orElseGet(() -> chatConversationRepository.save(ChatConversation.builder()
                        .jobMatch(match)
                        .build()));
        return chatMapper.toConversationResponse(conversation, currentUserId, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ChatMessageResponse> getMessages(
            UUID currentUserId,
            UUID conversationId,
            int page,
            int size
    ) {
        requireParticipantConversation(currentUserId, conversationId);
        Page<ChatMessageResponse> result = chatMessageRepository
                .findAllByConversation_IdOrderBySentAtDesc(conversationId, pageRequest(page, size))
                .map(chatMapper::toMessageResponse);
        return PageResponse.from(result);
    }

    @Override
    @Transactional
    public ChatReadResponse markRead(UUID currentUserId, UUID conversationId) {
        requireParticipantConversation(currentUserId, conversationId);
        int marked = chatMessageRepository.markUnreadAsRead(conversationId, currentUserId, Instant.now());
        return new ChatReadResponse(conversationId, marked);
    }

    @Override
    @Transactional
    public ChatMessageDelivery sendMessage(UUID currentUserId, ChatSendMessageRequest request) {
        if (request == null || request.conversationId() == null || request.clientMessageId() == null) {
            throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
        }
        String content = normalizeContent(request.content());
        ChatConversation conversation = requireParticipantConversation(currentUserId, request.conversationId());
        JobMatch match = conversation.getJobMatch();
        requireChatUnlocked(match);

        ChatMessage existing = chatMessageRepository
                .findByConversation_IdAndSender_IdAndClientMessageId(
                        conversation.getId(),
                        currentUserId,
                        request.clientMessageId()
                )
                .orElse(null);
        if (existing != null) {
            return delivery(existing, match);
        }

        User sender = match.getConsumer().getId().equals(currentUserId)
                ? match.getConsumer()
                : match.getProvider();
        Instant now = Instant.now();
        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .conversation(conversation)
                .sender(sender)
                .clientMessageId(request.clientMessageId())
                .content(content)
                .sentAt(now)
                .build());

        conversation.setLastMessageAt(now);
        conversation.setLastMessagePreview(preview(content));
        chatConversationRepository.save(conversation);

        User recipient = match.getConsumer().getId().equals(currentUserId)
                ? match.getProvider()
                : match.getConsumer();
        notificationService.create(
                recipient,
                NotificationType.CHAT_MESSAGE_RECEIVED,
                "Tin nhắn mới",
                sender.getFullName() + ": " + preview(content),
                conversation.getId(),
                "/messages/" + conversation.getId()
        );
        return delivery(message, match);
    }

    private void backfillUnlockedConversations(UUID currentUserId) {
        for (UUID matchId : jobMatchRepository.findConnectedMatchIdsWithoutConversation(
                currentUserId,
                MatchStatus.ACTIVE
        )) {
            JobMatch match = jobMatchRepository.findParticipantMatchForUpdate(matchId, currentUserId)
                    .orElse(null);
            if (match == null || match.getStatus() != MatchStatus.ACTIVE || match.getConnectionSucceededAt() == null || match.getChatUnlockedAt() == null || !contactAccess.unlocked(match)) {
                continue;
            }
            chatConversationRepository.findByJobMatch_Id(matchId)
                    .orElseGet(() -> chatConversationRepository.save(ChatConversation.builder()
                            .jobMatch(match)
                            .build()));
        }
    }

    private ChatMessageDelivery delivery(ChatMessage message, JobMatch match) {
        return new ChatMessageDelivery(
                chatMapper.toMessageResponse(message),
                match.getConsumer().getId(),
                match.getProvider().getId()
        );
    }

    private ChatConversation requireParticipantConversation(UUID currentUserId, UUID conversationId) {
        accountAccess.active(currentUserId);
        ChatConversation conversation = chatConversationRepository.findParticipantConversation(conversationId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        if (!contactAccess.unlocked(conversation.getJobMatch())) throw new AppException(ErrorCode.CHAT_NOT_UNLOCKED);
        return conversation;
    }

    private void requireChatUnlocked(JobMatch match) {
        if (match.getStatus() != MatchStatus.ACTIVE) {
            throw new AppException(ErrorCode.CHAT_MATCH_NOT_ACTIVE);
        }
        if (!contactAccess.unlocked(match) || match.getChatUnlockedAt() == null) {
            throw new AppException(ErrorCode.CHAT_NOT_UNLOCKED);
        }
    }

    private String normalizeContent(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
        }
        String content = raw.trim();
        if (content.length() > MAX_MESSAGE_LENGTH) {
            throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
        }
        return content;
    }

    private String preview(String content) {
        String oneLine = content.replaceAll("\\s+", " ").trim();
        return oneLine.length() <= MAX_PREVIEW_LENGTH
                ? oneLine
                : oneLine.substring(0, MAX_PREVIEW_LENGTH - 1) + "…";
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100)
        );
    }
}
