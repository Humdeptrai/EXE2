package com.handsfree.be.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CandidateHiringInsightsResponse(
        BigDecimal averageRating,
        long ratingCount,
        long successfulMatchCount,
        List<CandidateExpertiseResponse> topExpertise
) {
}
