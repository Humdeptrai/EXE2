package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.constant.PaymentMethod;
import com.handsfree.be.constant.PaymentStatus;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.response.ConnectionPaymentResponse;
import com.handsfree.be.entity.ChatConversation;
import com.handsfree.be.entity.ConnectionPayment;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.ConnectionPaymentMapper;
import com.handsfree.be.repository.ChatConversationRepository;
import com.handsfree.be.repository.ConnectionPaymentRepository;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.service.ConnectionPaymentService;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConnectionPaymentServiceImpl implements ConnectionPaymentService {
    private static final BigDecimal CONSUMER_FEE = BigDecimal.valueOf(10_000);
    private static final BigDecimal PROVIDER_FEE = BigDecimal.valueOf(5_000);
    private static final BigDecimal PLATFORM_FEE = BigDecimal.valueOf(15_000);

    private final JobMatchRepository jobMatchRepository;
    private final ConnectionPaymentRepository connectionPaymentRepository;
    private final ChatConversationRepository chatConversationRepository;
    private final ConnectionPaymentMapper connectionPaymentMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ConnectionPaymentResponse getPayment(UUID currentUserId, UUID matchId) {
        JobMatch match = jobMatchRepository.findParticipantMatchForUpdate(matchId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        ConnectionPayment payment = getOrCreatePayment(match);
        normalizeLegacyPayment(payment, match);
        finalizeConnectionIfReady(payment, match);
        return connectionPaymentMapper.toResponse(payment, currentUserId);
    }

    @Override
    @Transactional
    public ConnectionPaymentResponse pay(UUID currentUserId, UUID matchId, PaymentMethod paymentMethod) {
        JobMatch match = jobMatchRepository.findParticipantMatchForUpdate(matchId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        if (match.getStatus() != MatchStatus.ACTIVE) {
            throw new AppException(ErrorCode.PAYMENT_MATCH_NOT_ACTIVE);
        }

        ConnectionPayment payment = getOrCreatePayment(match);
        normalizeLegacyPayment(payment, match);
        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_REFUNDED);
        }

        boolean currentUserIsConsumer = match.getConsumer().getId().equals(currentUserId);
        PaymentStatus currentStatus = currentUserIsConsumer
                ? payment.getConsumerPaymentStatus()
                : payment.getProviderPaymentStatus();

        boolean newlyPaid = currentStatus != PaymentStatus.PAID;
        if (newlyPaid) {
            Instant now = Instant.now();
            if (currentUserIsConsumer) {
                payment.setConsumerPaymentStatus(PaymentStatus.PAID);
                payment.setConsumerPaymentMethod(paymentMethod);
                payment.setConsumerPaidAt(now);
            } else {
                payment.setProviderPaymentStatus(PaymentStatus.PAID);
                payment.setProviderPaymentMethod(paymentMethod);
                payment.setProviderPaidAt(now);
            }
            payment.setStatus(PaymentStatus.PENDING);
            connectionPaymentRepository.save(payment);

            notificationService.create(
                    currentUserIsConsumer ? match.getProvider() : match.getConsumer(),
                    NotificationType.PAYMENT_RECEIVED,
                    "Đối phương đã thanh toán",
                    (currentUserIsConsumer ? "Người thuê" : "Người nhận việc")
                            + " đã hoàn tất phí kết nối cho công việc “" + match.getJobPost().getTitle() + "”.",
                    match.getId(),
                    "/matches/" + match.getId() + "/payment"
            );
        }

        boolean newlyConnected = match.getConnectionSucceededAt() == null && bothSidesPaid(payment);
        finalizeConnectionIfReady(payment, match);
        if (newlyConnected) {
            notificationService.create(
                    match.getConsumer(),
                    NotificationType.CONNECTION_SUCCEEDED,
                    "Kết nối thành công",
                    "Hai phía đã thanh toán cho công việc “" + match.getJobPost().getTitle() + "”. Chat đã được mở.",
                    match.getId(),
                    "/messages/match/" + match.getId()
            );
            notificationService.create(
                    match.getProvider(),
                    NotificationType.CONNECTION_SUCCEEDED,
                    "Kết nối thành công",
                    "Hai phía đã thanh toán cho công việc “" + match.getJobPost().getTitle() + "”. Chat đã được mở.",
                    match.getId(),
                    "/messages/match/" + match.getId()
            );
        }
        return connectionPaymentMapper.toResponse(payment, currentUserId);
    }

    /**
     * Phase 07 stored one PAID state for the consumer and unlocked chat immediately.
     * The new two-sided model upgrades that row lazily: legacy PAID becomes
     * consumer=PAID/provider=PENDING and chat is locked until the provider pays.
     */
    private void normalizeLegacyPayment(ConnectionPayment payment, JobMatch match) {
        boolean paymentChanged = false;
        boolean matchChanged = false;

        if (payment.getConsumerPaymentStatus() == null) {
            PaymentStatus legacyConsumerStatus = switch (payment.getStatus()) {
                case PAID -> PaymentStatus.PAID;
                case REFUNDED -> PaymentStatus.REFUNDED;
                default -> PaymentStatus.PENDING;
            };
            payment.setConsumerPaymentStatus(legacyConsumerStatus);
            if (legacyConsumerStatus == PaymentStatus.PAID || legacyConsumerStatus == PaymentStatus.REFUNDED) {
                payment.setConsumerPaymentMethod(payment.getPaymentMethod());
                payment.setConsumerPaidAt(payment.getPaidAt());
            }
            paymentChanged = true;
        }

        if (payment.getProviderPaymentStatus() == null) {
            payment.setProviderPaymentStatus(PaymentStatus.PENDING);
            paymentChanged = true;
        }

        boolean bothPaid = bothSidesPaid(payment);
        if (!bothPaid && payment.getStatus() == PaymentStatus.PAID) {
            payment.setStatus(PaymentStatus.PENDING);
            paymentChanged = true;
        }

        if (!bothPaid && match.getConnectionSucceededAt() == null && match.getChatUnlockedAt() != null) {
            match.setChatUnlockedAt(null);
            matchChanged = true;
        }

        if (paymentChanged) {
            connectionPaymentRepository.save(payment);
        }
        if (matchChanged) {
            jobMatchRepository.save(match);
        }
    }

    private void finalizeConnectionIfReady(ConnectionPayment payment, JobMatch match) {
        if (!bothSidesPaid(payment)) {
            return;
        }

        Instant connectedAt = match.getConnectionSucceededAt();
        if (connectedAt == null) {
            connectedAt = latestPaidAt(payment);
            match.setConnectionSucceededAt(connectedAt);
            match.setChatUnlockedAt(connectedAt);
            jobMatchRepository.save(match);
        } else if (match.getChatUnlockedAt() == null) {
            match.setChatUnlockedAt(connectedAt);
            jobMatchRepository.save(match);
        }

        if (payment.getStatus() != PaymentStatus.PAID || payment.getPaidAt() == null) {
            payment.setStatus(PaymentStatus.PAID);
            payment.setPaidAt(connectedAt);
            connectionPaymentRepository.save(payment);
        }
        ensureConversation(match);
    }

    private boolean bothSidesPaid(ConnectionPayment payment) {
        return payment.getConsumerPaymentStatus() == PaymentStatus.PAID
                && payment.getProviderPaymentStatus() == PaymentStatus.PAID;
    }

    private Instant latestPaidAt(ConnectionPayment payment) {
        Instant consumerPaidAt = payment.getConsumerPaidAt();
        Instant providerPaidAt = payment.getProviderPaidAt();
        if (consumerPaidAt == null && providerPaidAt == null) {
            return Instant.now();
        }
        if (consumerPaidAt == null) {
            return providerPaidAt;
        }
        if (providerPaidAt == null) {
            return consumerPaidAt;
        }
        return consumerPaidAt.isAfter(providerPaidAt) ? consumerPaidAt : providerPaidAt;
    }

    private void ensureConversation(JobMatch match) {
        chatConversationRepository.findByJobMatch_Id(match.getId())
                .orElseGet(() -> chatConversationRepository.save(ChatConversation.builder()
                        .jobMatch(match)
                        .build()));
    }

    private ConnectionPayment getOrCreatePayment(JobMatch match) {
        return connectionPaymentRepository.findByJobMatch_Id(match.getId())
                .orElseGet(() -> connectionPaymentRepository.save(ConnectionPayment.builder()
                        .jobMatch(match)
                        .consumerFee(CONSUMER_FEE)
                        .providerFee(PROVIDER_FEE)
                        .platformFee(PLATFORM_FEE)
                        .status(PaymentStatus.PENDING)
                        .consumerPaymentStatus(PaymentStatus.PENDING)
                        .providerPaymentStatus(PaymentStatus.PENDING)
                        .build()));
    }
}
