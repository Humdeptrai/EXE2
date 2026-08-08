package com.handsfree.be.dto.request;

import com.handsfree.be.constant.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record ConnectionPaymentRequest(
        @NotNull(message = "Vui lòng chọn phương thức thanh toán")
        PaymentMethod paymentMethod
) {
}
