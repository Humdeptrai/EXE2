package com.handsfree.be.dto.response;

public record DiscoverySummaryResponse(
        long saved,
        long interested,
        long veryInterested,
        long skipped,
        long matching
) {
}
