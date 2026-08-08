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
import java.util.List;
import java.util.UUID;

@Component
public class ConnectionPaymentMapper {
    public ConnectionPaymentResponse toResponse(ConnectionPayment payment, UUID currentUserId) {
        JobMatch match = payment.getJobMatch();
        boolean currentUserIsConsumer = match.getConsumer().getId().equals(currentUserId);
        User counterpart = currentUserIsConsumer ? match.getProvider() : match.getConsumer();
        MatchUserResponse counterpartResponse = new MatchUserResponse(
                counterpart.getId(),
                counterpart.getFullName(),
                counterpart.getAvatarUrl(),
                counterpart.getLocation(),
                counterpart.getBio(),
                counterpart.getProfileTags() == null ? List.of() : List.copyOf(counterpart.getProfileTags()),
                counterpart.isProfileCompleted()
        );

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
        boolean connectionSucceeded = match.getConnectionSucceededAt() != null;
        boolean chatUnlocked = connectionSucceeded && match.getChatUnlockedAt() != null;

        return new ConnectionPaymentResponse(
                payment.getId(),
                match.getId(),
                match.getJobPost().getId(),
                match.getJobPost().getTitle(),
                match.getJobPost().getScheduledDate(),
                match.getJobPost().getStartTime(),
                match.getJobPost().getLocation(),
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
                counterpartResponse
        );
    }
}
