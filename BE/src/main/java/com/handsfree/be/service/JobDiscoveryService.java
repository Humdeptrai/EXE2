package com.handsfree.be.service;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.dto.response.DiscoverySummaryResponse;
import com.handsfree.be.dto.response.JobDiscoveryResponse;
import com.handsfree.be.dto.response.JobInteractionStateResponse;
import com.handsfree.be.dto.response.PageResponse;

import java.math.BigDecimal;
import java.util.UUID;

public interface JobDiscoveryService {
    PageResponse<JobDiscoveryResponse> getFeed(
            UUID userId,
            String keyword,
            UUID categoryId,
            String location,
            BigDecimal minBudget,
            BigDecimal maxBudget,
            int page,
            int size
    );

    JobDiscoveryResponse getDetail(UUID userId, UUID jobId);

    PageResponse<JobDiscoveryResponse> getSaved(UUID userId, int page, int size);

    PageResponse<JobDiscoveryResponse> getInterested(UUID userId, InterestLevel level, int page, int size);

    PageResponse<JobDiscoveryResponse> getSkipped(UUID userId, int page, int size);

    DiscoverySummaryResponse getSummary(UUID userId);

    JobInteractionStateResponse save(UUID userId, UUID jobId);

    JobInteractionStateResponse unsave(UUID userId, UUID jobId);

    JobInteractionStateResponse skip(UUID userId, UUID jobId);

    JobInteractionStateResponse restoreSkipped(UUID userId, UUID jobId);

    JobInteractionStateResponse expressInterest(UUID userId, UUID jobId, InterestLevel level);

    JobInteractionStateResponse withdrawInterest(UUID userId, UUID jobId);
}
