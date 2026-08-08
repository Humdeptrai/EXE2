package com.handsfree.be.exception;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        int code,
        String message,
        Map<String, String> errors,
        Instant timestamp
) {}
