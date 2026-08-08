package com.handsfree.be.dto.response;

import com.handsfree.be.constant.BudgetType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record JobDiscoveryResponse(
        UUID id,
        JobOwnerSummaryResponse owner,
        JobCategoryResponse category,
        String title,
        String description,
        LocalDate scheduledDate,
        LocalTime startTime,
        String location,
        BigDecimal budgetAmount,
        BudgetType budgetType,
        int requiredWorkers,
        List<JobMediaResponse> media,
        JobInteractionStateResponse interaction,
        Instant publishedAt
) {
}
