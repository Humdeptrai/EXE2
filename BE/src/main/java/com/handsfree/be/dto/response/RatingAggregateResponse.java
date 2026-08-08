package com.handsfree.be.dto.response;

import java.math.BigDecimal;

public record RatingAggregateResponse(
        BigDecimal averageRating,
        long ratingCount,
        long successfulMatchCount
) {
}
