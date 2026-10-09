package com.handsfree.be.dto.response;

import java.time.Instant;
import java.util.UUID;

public record MatchRatingStateResponse(
        UUID matchId,
        UUID jobId,
        String jobTitle,
        MatchUserResponse counterpart,
        boolean connectionSucceeded,
        Instant connectionSucceededAt,
        Instant scheduledAt,
        Instant ratingEligibleAt,
        boolean ratingWindowOpen,
        boolean alreadyRated,
        boolean canRate,
        MatchRatingResponse myRating,
        UserReputationResponse counterpartReputation,
        com.handsfree.be.constant.UserMode counterpartMode,
        Instant expectedEndAt,
        Instant ratingClosesAt,
        boolean ratingExpired,
        boolean canReport
) {
}
