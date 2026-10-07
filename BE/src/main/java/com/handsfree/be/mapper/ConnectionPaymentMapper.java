package com.handsfree.be.mapper;

import com.handsfree.be.constant.PaymentMethod;
import com.handsfree.be.constant.PaymentStatus;
import com.handsfree.be.dto.response.ConnectionPaymentResponse;
import com.handsfree.be.dto.response.MatchUserResponse;
import com.handsfree.be.entity.ConnectionPayment;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Component
@lombok.RequiredArgsConstructor
public class ConnectionPaymentMapper {
    private final com.handsfree.be.serviceImpl.ContactAccess contactAccess;
    public ConnectionPaymentResponse toResponse(ConnectionPayment payment, UUID currentUserId) {
        JobMatch match = payment.getJobMatch();
        boolean currentUserIsConsumer = match.getConsumer().getId().equals(currentUserId);
        User counterpart = currentUserIsConsumer ? match.getProvider() : match.getConsumer();
        MatchUserResponse counterpartResponse = contactAccess.user(counterpart, match);

        BigDecimal currentUserFee = currentUserIsConsumer ? payment.getConsumerFee() : payment.getProviderFee();
        PaymentStatus currentUserPaymentStatus = currentUserIsConsumer
                ? payment.getConsumerPaymentStatus()
                : payment.getProviderPaymentStatus();
        PaymentMethod currentUserPaymentMethod = currentUserIsConsumer
                ? payment.getConsumerPaymentMethod()
                : payment.getProviderPaymentMethod();
        Instant currentUserPaidAt = currentUserIsConsumer
                ? payment.getConsumerPaidAt()
                : payment.getProviderPaidAt();
        PaymentStatus counterpartStatus = currentUserIsConsumer
                ? payment.getProviderPaymentStatus()
                : payment.getConsumerPaymentStatus();
        boolean connectionSucceeded = contactAccess.unlocked(match);
        boolean chatUnlocked = connectionSucceeded && match.getChatUnlockedAt() != null;

        return new ConnectionPaymentResponse(
                payment.getId(),
                match.getId(),
                match.getJobPost().getId(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(match.getJobPost().getTitle()),
                match.getJobPost().getScheduledDate(),
                match.getJobPost().getStartTime(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(match.getJobPost().getLocation()),
                payment.getConsumerFee(),
                payment.getProviderFee(),
                payment.getPlatformFee(),
                payment.getStatus(),
                payment.getConsumerPaymentStatus(),
                payment.getProviderPaymentStatus(),
                payment.getConsumerPaymentMethod(),
                payment.getProviderPaymentMethod(),
                payment.getConsumerPaidAt(),
                payment.getProviderPaidAt(),
                currentUserIsConsumer,
                currentUserFee,
                currentUserPaymentStatus,
                currentUserPaymentMethod,
                currentUserPaidAt,
                counterpartStatus == PaymentStatus.PAID,
                connectionSucceeded,
                match.getConnectionSucceededAt(),
                chatUnlocked,
                payment.getPaidAt(),
                match.getPaymentDeadlineAt(),
                match.getStatus(),
                payment.getRefundedAt(),
                Instant.now(),
                counterpartResponse
        );
    }
}
