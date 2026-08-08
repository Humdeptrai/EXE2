package com.handsfree.be.dto.response;

import com.handsfree.be.constant.UserMode;

import java.time.Instant;
import java.util.UUID;

public record MatchRatingResponse(
        UUID id,
        UUID matchId,
        UUID raterId,
        UUID ratedUserId,
        UserMode ratedAsMode,
        int stars,
        String comment,
        Instant ratedAt
) {
}
