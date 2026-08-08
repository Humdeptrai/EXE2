package com.handsfree.be.mapper;

import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.dto.response.ChatConversationResponse;
import com.handsfree.be.dto.response.ChatMessageResponse;
import com.handsfree.be.dto.response.MatchUserResponse;
import com.handsfree.be.entity.ChatConversation;
import com.handsfree.be.entity.ChatMessage;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class ChatMapper {
    public ChatConversationResponse toConversationResponse(
            ChatConversation conversation,
            UUID currentUserId,
            long unreadCount
    ) {
        JobMatch match = conversation.getJobMatch();
        User counterpart = match.getConsumer().getId().equals(currentUserId)
                ? match.getProvider()
                : match.getConsumer();
        MatchUserResponse counterpartResponse = new MatchUserResponse(
                counterpart.getId(),
                counterpart.getFullName(),
                counterpart.getAvatarUrl(),
                counterpart.getLocation(),
                counterpart.getBio(),
                counterpart.getProfileTags() == null ? List.of() : List.copyOf(counterpart.getProfileTags()),
                counterpart.isProfileCompleted()
        );
        boolean chatUnlocked = match.getConnectionSucceededAt() != null && match.getChatUnlockedAt() != null;
        boolean canSend = match.getStatus() == MatchStatus.ACTIVE && chatUnlocked;
        return new ChatConversationResponse(
                conversation.getId(),
                match.getId(),
                match.getJobPost().getId(),
                match.getJobPost().getTitle(),
                counterpartResponse,
                match.getStatus(),
                chatUnlocked,
                canSend,
                conversation.getLastMessagePreview(),
                conversation.getLastMessageAt(),
                unreadCount
        );
    }

    public ChatMessageResponse toMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getConversation().getId(),
                message.getClientMessageId(),
                message.getSender().getId(),
                message.getSender().getFullName(),
                message.getSender().getAvatarUrl(),
                message.getContent(),
                message.getSentAt(),
                message.getReadAt()
        );
    }
}
