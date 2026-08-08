package com.handsfree.be.dto.response;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.constant.InterestStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CandidateResponse(
        UUID interestId,
        UUID jobId,
        UUID applicantId,
        String displayName,
        String avatarUrl,
        String location,
        String bio,
        List<String> tags,
        boolean profileCompleted,
        boolean identityRevealed,
        InterestLevel interestLevel,
        InterestStatus interestStatus,
        Instant requestedAt,
        Instant respondedAt,
        CandidateHiringInsightsResponse hiringInsights
) {
}
