package com.handsfree.be.dto.response;

import java.util.UUID;

public record UserReputationResponse(
        UUID userId,
        RatingAggregateResponse overall,
        RatingAggregateResponse asConsumer,
        RatingAggregateResponse asProvider
) {
}
