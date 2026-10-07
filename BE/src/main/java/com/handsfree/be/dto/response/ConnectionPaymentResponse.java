package com.handsfree.be.dto.response;

import com.handsfree.be.constant.PaymentMethod;
import com.handsfree.be.constant.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ConnectionPaymentResponse(
        UUID id,
        UUID matchId,
        UUID jobId,
        String jobTitle,
        LocalDate scheduledDate,
        LocalTime startTime,
        String location,
        BigDecimal consumerFee,
        BigDecimal providerFee,
        BigDecimal platformFee,
        PaymentStatus status,
        PaymentStatus consumerPaymentStatus,
        PaymentStatus providerPaymentStatus,
        PaymentMethod consumerPaymentMethod,
        PaymentMethod providerPaymentMethod,
        Instant consumerPaidAt,
        Instant providerPaidAt,
        boolean currentUserIsConsumer,
        BigDecimal currentUserFee,
        PaymentStatus currentUserPaymentStatus,
        PaymentMethod currentUserPaymentMethod,
        Instant currentUserPaidAt,
        boolean counterpartPaid,
        boolean connectionSucceeded,
        Instant connectionSucceededAt,
        boolean chatUnlocked,
        Instant paidAt,
        Instant paymentDeadlineAt,
        com.handsfree.be.constant.MatchStatus matchStatus,
        Instant refundedAt,
        Instant serverTime,
        MatchUserResponse counterpart
) {
}
