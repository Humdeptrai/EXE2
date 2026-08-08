package com.handsfree.be.dto.response;

public record ChatSocketErrorResponse(
        int code,
        String message
) {}
