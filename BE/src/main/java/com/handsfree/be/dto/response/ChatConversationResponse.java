package com.handsfree.be.dto.response;

import com.handsfree.be.constant.MatchStatus;

import java.time.Instant;
import java.util.UUID;

public record ChatConversationResponse(
        UUID id,
        UUID matchId,
        UUID jobId,
        String jobTitle,
        MatchUserResponse counterpart,
        MatchStatus matchStatus,
        boolean chatUnlocked,
        boolean canSend,
        String lastMessagePreview,
        Instant lastMessageAt,
        long unreadCount
) {}
