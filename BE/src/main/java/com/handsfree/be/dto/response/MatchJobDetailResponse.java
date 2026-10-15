package com.handsfree.be.dto.response;

import com.handsfree.be.constant.BudgetType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/** Text-only job details. Uploaded job media is not verification-safe and must not be exposed here. */
public record MatchJobDetailResponse(UUID id, JobCategoryResponse category, String title,
        String description, LocalDate scheduledDate, LocalTime startTime,
        java.time.LocalDateTime expectedEndAt, String location, BigDecimal budgetAmount,
        BudgetType budgetType, int requiredWorkers, Double latitude, Double longitude) {}
