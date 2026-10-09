package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.ManagementService;
import com.handsfree.be.service.PlatformSettingsService;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ManagementServiceImpl implements ManagementService {
    private final AccountAccess access;
    private final AdminAuditRepository audit;
    private final UserRepository users;
    private final JobPostRepository jobs;
    private final PlatformSettingsService settings;
    private final JobMatchRepository matches;
    private final ConnectionPaymentRepository payments;
    private final WalletService wallet;
    private final WalletEntryRepository entries;

    public void log(UUID actor, String action, String detail) {
        audit.save(
                AdminAudit.builder()
                        .actorId(actor)
                        .action(action)
                        .detail(detail)
                        .occurredAt(Instant.now())
                        .build());
    }

    @Transactional
    public void hideJob(UUID actor, UUID id, boolean hidden, String reason) {
        access.operator(actor, false);
        var job =
                jobs.findDiscoveryForUpdate(id)
                        .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        job.setModerationHidden(hidden);
        log(actor, "JOB_VISIBILITY", id + " hidden=" + hidden + " " + reason);
    }

    @Transactional
    public void updateUser(UUID actor, UUID id, UserRole role, boolean active, String reason) {
        access.operator(actor, true);
        var user = users.lockById(id).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (user.getRole() == UserRole.ADMIN && (role != UserRole.ADMIN || !active))
            throw new AppException(ErrorCode.FORBIDDEN);
        if (actor.equals(id)) throw new AppException(ErrorCode.FORBIDDEN);
        user.setRole(role);
        user.setActive(active);
        log(actor, "USER_ACCESS", id + " role=" + role + " active=" + active + " " + reason);
    }

    @Transactional
    public PlatformSettings changeSettings(
            UUID actor,
            BigDecimal consumer,
            BigDecimal provider,
            long min,
            long max,
            boolean enabled,
            int paymentWindowMinutes, int ratingDelayMinutes) {
        access.operator(actor, true);
        if (ratingDelayMinutes < 0 || ratingDelayMinutes > 43200)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (paymentWindowMinutes < 1 || paymentWindowMinutes > 43200)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (min < 1000 || max < min || max > 100000000)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        var s = settings.get();
        s.setConsumerFee(consumer);
        s.setProviderFee(provider);
        s.setMinTopUp(min);
        s.setMaxTopUp(max);
        s.setTopUpEnabled(enabled);
        s.setPaymentWindowMinutes(paymentWindowMinutes);
        s.setRatingDelayMinutes(ratingDelayMinutes);
        log(actor, "RATING_SETTINGS", "delayMinutes=" + ratingDelayMinutes + " windowDays=7");
        log(
                actor,
                "FEE_SETTINGS",
                "consumer="
                        + consumer
                        + " provider="
                        + provider
                        + " min="
                        + min
                        + " max="
                        + max
                        + " enabled="
                        + enabled + " paymentWindowMinutes=" + paymentWindowMinutes);
        return s;
    }

    @Transactional
    public void refund(UUID actor, UUID matchId, String reason) {
        access.operator(actor, true);
        var match =
                matches.lockForAdmin(matchId)
                        .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        var payment =
                payments.findByJobMatch_Id(matchId)
                        .orElseThrow(() -> new AppException(ErrorCode.DATA_CONFLICT));
        if (payment.getStatus() == PaymentStatus.REFUNDED) return;
        var owners =
                new ArrayList<>(List.of(match.getConsumer().getId(), match.getProvider().getId()));
        owners.sort(Comparator.comparing(UUID::toString));
        for (UUID owner : owners) {
            boolean consumer = owner.equals(match.getConsumer().getId());
            var status =
                    consumer
                            ? payment.getConsumerPaymentStatus()
                            : payment.getProviderPaymentStatus();
            var method =
                    consumer
                            ? payment.getConsumerPaymentMethod()
                            : payment.getProviderPaymentMethod();
            if (status == PaymentStatus.PAID
                    && method == PaymentMethod.WALLET
                    && entries.existsByDedupeKey("CONNECT:" + matchId + ":" + owner)) {
                wallet.refund(
                        owner,
                        consumer ? payment.getConsumerFee() : payment.getProviderFee(),
                        "REFUND:" + matchId + ":" + owner);
                if (consumer) payment.setConsumerPaymentStatus(PaymentStatus.REFUNDED);
                else payment.setProviderPaymentStatus(PaymentStatus.REFUNDED);
            }
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(Instant.now());
        match.setChatUnlockedAt(null);
        match.setConnectionSucceededAt(null);
        log(actor, "CONNECTION_REFUND", matchId + " " + reason);
    }
}
