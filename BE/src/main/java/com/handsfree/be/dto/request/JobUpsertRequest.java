package com.handsfree.be.dto.request;

import com.handsfree.be.constant.BudgetType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record JobUpsertRequest(
        @NotBlank(message = "Tiêu đề công việc không được để trống")
        @Size(max = 120, message = "Tiêu đề công việc tối đa 120 ký tự")
        String title,

        @NotNull(message = "Danh mục không được để trống")
        UUID categoryId,

        @NotBlank(message = "Mô tả công việc không được để trống")
        @Size(max = 2000, message = "Mô tả công việc tối đa 2000 ký tự")
        String description,

        @NotNull(message = "Ngày thực hiện không được để trống")
        @FutureOrPresent(message = "Ngày thực hiện không được nằm trong quá khứ")
        LocalDate scheduledDate,

        @NotNull(message = "Giờ bắt đầu không được để trống")
        LocalTime startTime,

        @NotNull(message = "Thời gian kết thúc dự kiến không được để trống")
        java.time.LocalDateTime expectedEndAt,

        @NotBlank(message = "Địa điểm không được để trống")
        @Size(max = 255, message = "Địa điểm tối đa 255 ký tự")
        String location,

        @NotNull(message = "Ngân sách không được để trống")
        @Positive(message = "Ngân sách phải lớn hơn 0")
        @Digits(integer = 12, fraction = 0, message = "Ngân sách phải là số nguyên VNĐ")
        @DecimalMax(value = "999999999999", message = "Ngân sách vượt quá giới hạn")
        BigDecimal budgetAmount,

        @NotNull(message = "Hình thức ngân sách không được để trống")
        BudgetType budgetType,

        @NotNull(message = "Số người cần không được để trống")
        @Positive(message = "Số người cần phải lớn hơn 0")
        Integer requiredWorkers
) {
}
