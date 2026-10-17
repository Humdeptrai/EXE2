package com.handsfree.be.dto.response;

/** Recommendation index, not a probability of successful work. No private identity data. */
public record RecommendationResponse(
        int score, double ratingScore, double categoryScore, double experienceScore,
        Double averageRating, long ratingCount, long successfulConnections,
        long sameCategoryConnections, boolean limitedData
) {}
