package com.handsfree.be.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record MatchRatingRequest(
        @Min(value = 1, message = "Số sao phải từ 1 đến 5")
        @Max(value = 5, message = "Số sao phải từ 1 đến 5")
        int stars,
        @Size(max = 500, message = "Nhận xét không được vượt quá 500 ký tự")
        String comment
) {
}
