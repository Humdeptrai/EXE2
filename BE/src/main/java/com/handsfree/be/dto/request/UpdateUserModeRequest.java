package com.handsfree.be.dto.request;

import com.handsfree.be.constant.UserMode;
import jakarta.validation.constraints.NotNull;

public record UpdateUserModeRequest(
        @NotNull(message = "Chế độ sử dụng không được để trống")
        UserMode mode
) {
}
