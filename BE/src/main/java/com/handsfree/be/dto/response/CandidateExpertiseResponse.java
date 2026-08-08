package com.handsfree.be.dto.response;

import java.util.UUID;

public record CandidateExpertiseResponse(
        UUID categoryId,
        String code,
        String name,
        String icon,
        long successfulMatchCount
) {
}
