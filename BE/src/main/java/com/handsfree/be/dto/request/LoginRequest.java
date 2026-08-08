package com.handsfree.be.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Email hoặc số điện thoại không được để trống")
        String identifier,

        @NotBlank(message = "Mật khẩu không được để trống")
        String password
) {}
