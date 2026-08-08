package com.handsfree.be.dto.response;

import com.handsfree.be.constant.AuthProvider;
import com.handsfree.be.constant.UserMode;
import com.handsfree.be.constant.UserRole;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        String phone,
        String avatarUrl,
        String bio,
        String location,
        List<String> tags,
        boolean profileCompleted,
        AuthProvider authProvider,
        UserRole role,
        UserMode currentMode,
        Instant createdAt,
        Instant updatedAt
) {
}
