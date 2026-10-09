package com.handsfree.be.dto.request;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
public record ReportRequest(@NotBlank String targetType, @NotNull UUID targetId,
        @NotBlank @Size(max = 2000) String reason,
        @Size(max = 5) List<@NotBlank @Size(max = 2000) String> links) {}
