package com.handsfree.be.service;

import com.handsfree.be.constant.PaymentMethod;
import com.handsfree.be.dto.response.ConnectionPaymentResponse;

import java.util.UUID;

public interface ConnectionPaymentService {
    ConnectionPaymentResponse getPayment(UUID currentUserId, UUID matchId);

    ConnectionPaymentResponse pay(UUID currentUserId, UUID matchId, PaymentMethod paymentMethod);
}
