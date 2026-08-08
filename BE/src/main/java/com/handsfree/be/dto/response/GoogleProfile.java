package com.handsfree.be.dto.response;

public record GoogleProfile(
        String subject,
        String email,
        String fullName,
        boolean emailVerified
) {}
