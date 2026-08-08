package com.handsfree.be.dto.response;

import java.util.List;
import java.util.UUID;

public record JobOwnerSummaryResponse(
        UUID id,
        String fullName,
        String avatarUrl,
        String location,
        boolean profileCompleted,
        List<String> tags
) {
}
