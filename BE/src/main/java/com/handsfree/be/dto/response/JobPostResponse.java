package com.handsfree.be.dto.response;

import com.handsfree.be.constant.BudgetType;
import com.handsfree.be.constant.JobStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record JobPostResponse(
        UUID id,
        UUID ownerId,
        JobCategoryResponse category,
        String title,
        String description,
        LocalDate scheduledDate,
        LocalTime startTime,
        String location,
        BigDecimal budgetAmount,
        BudgetType budgetType,
        int requiredWorkers,
        JobStatus status,
        int applicantCount,
        int matchedCount,
        List<JobMediaResponse> media,
        Instant publishedAt,
        Instant completedAt,
        Instant cancelledAt,
        Instant createdAt,
        Instant updatedAt
) {
}
