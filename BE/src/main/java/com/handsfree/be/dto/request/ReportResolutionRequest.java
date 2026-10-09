package com.handsfree.be.dto.request;
import jakarta.validation.constraints.*;
public record ReportResolutionRequest(@NotBlank String status,
        @NotBlank @Size(max = 2000) String resolution) {}
