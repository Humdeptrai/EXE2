package com.handsfree.be.dto.response;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
public record ReportResponse(UUID id, UUID reporterId, String targetType, UUID targetId,
        String reason, String status, String resolution, Instant createdAt, Instant resolvedAt,
        UUID resolvedBy, UUID assignedTo, String assignedName, Instant assignedAt,
        boolean canClaim, boolean canRelease, boolean canResolve,
        List<String> links, List<Evidence> evidence, String reporterName, String targetName) {
    public record Evidence(UUID id, String originalName, String contentType, long sizeBytes, String path) {}
}
