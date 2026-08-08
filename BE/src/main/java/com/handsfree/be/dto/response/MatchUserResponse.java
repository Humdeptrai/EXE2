package com.handsfree.be.dto.response;

import java.util.List;
import java.util.UUID;

public record MatchUserResponse(
        UUID id,
        String fullName,
        String avatarUrl,
        String location,
        String bio,
        List<String> tags,
        boolean profileCompleted
) {
}
