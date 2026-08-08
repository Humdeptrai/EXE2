package com.handsfree.be.dto.response;

import com.handsfree.be.constant.BudgetType;
import com.handsfree.be.constant.MatchStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record MatchResponse(
        UUID id,
        UUID jobId,
        String jobTitle,
        JobCategoryResponse category,
        LocalDate scheduledDate,
        LocalTime startTime,
        String location,
        BigDecimal budgetAmount,
        BudgetType budgetType,
        int requiredWorkers,
        MatchStatus status,
        MatchUserResponse counterpart,
        Instant matchedAt,
        Instant connectionSucceededAt,
        boolean connectionSucceeded,
        boolean chatUnlocked
) {
}
