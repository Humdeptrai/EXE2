package com.handsfree.be.serviceImpl;
import static com.handsfree.be.diagnostics.PerformanceTrace.measure;

import com.handsfree.be.constant.MatchStatus;
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

    private final org.springframework.transaction.PlatformTransactionManager transactionManager;
    private final ContactAccess contactAccess;
    private final AccountAccess accountAccess;
    private final JobMatchRepository jobMatchRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatMapper chatMapper;
    private final com.handsfree.be.service.ChatEventService events;
    private final com.handsfree.be.service.ChatAttachmentStorageService attachmentStorage;

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
        var conversation = requireParticipantConversation(currentUserId, conversationId);
        var match = conversation.getJobMatch();
        int marked = chatMessageRepository.markUnreadAsRead(conversationId, currentUserId, Instant.now());
        if (marked > 0) events.publish(match.getConsumer().getId(), match.getProvider().getId(),
                com.handsfree.be.dto.response.ChatSocketEventResponse.read(conversationId, currentUserId));
        return new ChatReadResponse(conversationId, marked);
    }

    @Override
    @Transactional
    public ChatMessageDelivery sendMessage(UUID currentUserId, ChatSendMessageRequest request) {
        if (request == null || request.conversationId() == null || request.clientMessageId() == null) {
            throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
        }
        String content = normalizeContent(request.content());
        ChatConversation conversation = lockedConversation(currentUserId, request.conversationId());
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

        publish(message, match, false);
        return delivery(message, match);
    }

    @Override @Transactional(readOnly = true)
    public long unreadCount(UUID user) { accountAccess.active(user); return chatMessageRepository.countAllUnread(user); }

    private ChatConversation lockedConversation(UUID user, UUID id) {
        requireParticipantConversation(user, id);
        var conversation = chatConversationRepository.lockById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        requireChatUnlocked(conversation.getJobMatch());
        return conversation;
    }

    @Override @Transactional
    public ChatMessageResponse heart(UUID user, UUID conversationId, UUID messageId, boolean liked) {
        var conversation = lockedConversation(user, conversationId);
        var message = chatMessageRepository.findById(messageId)
                .filter(m -> m.getConversation().getId().equals(conversationId))
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        if (liked) message.getHearts().add(user); else message.getHearts().remove(user);
        publish(message, conversation.getJobMatch(), true);
        return chatMapper.toMessageResponse(message);
    }

    @Override @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public ChatMessageResponse sendAttachment(UUID user, UUID conversationId, UUID clientId, String raw,
            org.springframework.web.multipart.MultipartFile file) {
        if (clientId == null) throw new AppException(ErrorCode.CHAT_MESSAGE_INVALID);
        var content = raw == null || raw.isBlank() ? "" : normalizeContent(raw);
        measure("chat.validate", () -> { validateAttachment(file); return null; });
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        var existing = measure("chat.authorize.transaction", () -> transaction.execute(status -> {
            var conversation = requireParticipantConversation(user, conversationId);
            requireChatUnlocked(conversation.getJobMatch());
            return chatMessageRepository.findByConversation_IdAndSender_IdAndClientMessageId(conversationId, user, clientId)
                    .map(chatMapper::toMessageResponse).orElse(null);
        }));
        if (existing != null) return existing;
        // Upload outside the database transaction: another message must not wait for storage.
        var stored = measure("chat.storage.upload", () -> attachmentStorage.store(file));
        var retained = new java.util.concurrent.atomic.AtomicBoolean(false);
        try {
            return measure("chat.persist.transaction", () -> transaction.execute(status -> {
                // Authorization and idempotency are checked again after the upload.
                var conversation = lockedConversation(user, conversationId);
                var duplicate = chatMessageRepository.findByConversation_IdAndSender_IdAndClientMessageId(conversationId, user, clientId);
                if (duplicate.isPresent()) return chatMapper.toMessageResponse(duplicate.get());
                var match = conversation.getJobMatch();
                var message = ChatMessage.builder().conversation(conversation)
                    .sender(match.getConsumer().getId().equals(user) ? match.getConsumer() : match.getProvider())
                    .clientMessageId(clientId).content(content).sentAt(Instant.now())
                    .attachmentName(safeName(file.getOriginalFilename())).attachmentType(file.getContentType())
                    .attachmentSize(file.getSize()).attachmentProvider(stored.provider()).attachmentKey(stored.key()).build();
                chatMessageRepository.save(message);
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                    new org.springframework.transaction.support.TransactionSynchronization() {
                        public void afterCommit() { retained.set(true); }
                    });
                conversation.setLastMessageAt(message.getSentAt());
                conversation.setLastMessagePreview(content.isEmpty() ?
                    (file.getContentType().startsWith("image/") ? "Đã gửi ảnh" : file.getContentType().startsWith("video/") ? "Đã gửi video" : "Đã gửi tệp") : preview(content));
                publish(message, match, false);
                return chatMapper.toMessageResponse(message);
            }));
        } finally {
            // Also discard an extra upload if a concurrent retry already stored this client ID.
            if (!retained.get()) attachmentStorage.delete(stored);
        }
    }

    private String safeName(String original) {
        String value = java.util.Objects.requireNonNullElse(original, "Tệp đính kèm").replace('\\', '/');
        value = value.substring(value.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
        return value.isBlank() ? "Tệp đính kèm" : value.substring(0, Math.min(255, value.length()));
    }
    private void validateAttachment(org.springframework.web.multipart.MultipartFile file) {
        String type = file == null ? "" : java.util.Objects.requireNonNullElse(file.getContentType(), "");
        long max = type.equals("video/mp4") ? 50L * 1024 * 1024 : 10L * 1024 * 1024;
        if (file == null || file.isEmpty() || file.getSize() > max
                || !java.util.Set.of("image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf", "text/plain").contains(type))
            throw new AppException(ErrorCode.CHAT_ATTACHMENT_INVALID);
        try (var in = file.getInputStream()) {
            byte[] b = in.readNBytes(32);
            boolean valid = switch (type) {
                case "image/jpeg" -> b.length >= 3 && (b[0]&255)==255 && (b[1]&255)==216 && (b[2]&255)==255;
                case "image/png" -> b.length>=8 && java.util.Arrays.equals(java.util.Arrays.copyOf(b,8), new byte[]{(byte)137,80,78,71,13,10,26,10});
                case "image/webp" -> b.length>=12 && new String(b,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(b,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
                case "video/mp4" -> b.length>=12 && new String(b,4,4,java.nio.charset.StandardCharsets.US_ASCII).equals("ftyp")
                    && java.util.Set.of("isom","iso2","mp41","mp42","avc1","M4V ","MSNV","dash","iso5","iso6").contains(new String(b,8,4,java.nio.charset.StandardCharsets.US_ASCII));
                case "application/pdf" -> b.length>=5 && new String(b,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-");
                default -> new String(b,java.nio.charset.StandardCharsets.UTF_8).indexOf('\0')<0;
            };
            if (!valid) throw new AppException(ErrorCode.CHAT_ATTACHMENT_INVALID);
        } catch (java.io.IOException error) { throw new AppException(ErrorCode.CHAT_ATTACHMENT_INVALID); }
    }

    @Override @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public com.handsfree.be.storage.PrivateChatFile attachment(UUID user, UUID conversationId, UUID messageId) {
        var transaction = new org.springframework.transaction.support.TransactionTemplate(transactionManager);
        transaction.setReadOnly(true);
        var message = measure("chat.download.authorize.transaction", () -> transaction.execute(status -> {
            requireParticipantConversation(user, conversationId);
            return chatMessageRepository.findById(messageId)
                .filter(m -> m.getConversation().getId().equals(conversationId) && m.getAttachmentKey() != null)
                .orElseThrow(() -> new AppException(ErrorCode.CONVERSATION_NOT_FOUND));
        }));
        // Opening remote storage must not hold a database connection while the user downloads.
        return new com.handsfree.be.storage.PrivateChatFile(measure("chat.storage.open", () -> attachmentStorage.open(message)), message.getAttachmentType(), message.getAttachmentName(), message.getAttachmentSize());
    }
    private void publish(ChatMessage message, JobMatch match, boolean update) {
        var response = chatMapper.toMessageResponse(message);
        events.publish(match.getConsumer().getId(), match.getProvider().getId(), update
            ? com.handsfree.be.dto.response.ChatSocketEventResponse.updated(response)
            : com.handsfree.be.dto.response.ChatSocketEventResponse.message(response));
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
