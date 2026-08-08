package com.handsfree.be.dto.request;

import com.handsfree.be.constant.InterestLevel;
import jakarta.validation.constraints.NotNull;

public record JobInterestRequest(
        @NotNull(message = "Mức độ quan tâm là bắt buộc")
        InterestLevel level
) {
}
