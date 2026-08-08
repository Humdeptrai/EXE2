package com.handsfree.be.dto.response;

public record JobManagementSummaryResponse(
        long active,
        long completed,
        long draft
) {
}
