package com.handsfree.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDateTime;

public record AdminMatchScheduleRequest(
        @NotNull LocalDateTime startAt,
        @NotNull LocalDateTime endAt,
        @NotNull Instant expectedUpdatedAt,
        @NotBlank @Size(max = 1000) String reason
) {}
