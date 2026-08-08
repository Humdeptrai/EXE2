package com.handsfree.be.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank(message = "Google credential không được để trống")
        String credential
) {}
