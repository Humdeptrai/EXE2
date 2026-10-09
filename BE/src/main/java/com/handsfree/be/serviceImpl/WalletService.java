package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.PlatformSettingsService;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {
    private final UserRepository users;
    private final WalletEntryRepository entries;
    private final WalletTopUpRepository topUps;
    private final PlatformSettingsService settings;

    @Transactional
    public void debit(UUID owner, BigDecimal amount, String key) {
        if (amount == null || amount.signum() <= 0 || amount.scale() > 0)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        change(owner, amount.negate(), key, "CONNECTION_FEE", "Phí mở liên hệ");
    }

    @Transactional
    public void refund(UUID owner, BigDecimal amount, String key) {
        if (amount == null || amount.signum() <= 0 || amount.scale() > 0)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        change(owner, amount, key, "REFUND", "Hoàn phí kết nối");
    }

    private void change(
            UUID owner, BigDecimal amount, String key, String kind, String description) {
        User user =
                users.lockById(owner).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!user.isActive() && !kind.equals("REFUND") && !kind.equals("TOPUP"))
            throw new AppException(ErrorCode.USER_DISABLED);
        if (entries.existsByDedupeKey(key)) return;
        BigDecimal balance = user.getWalletBalance().add(amount);
        if (balance.signum() < 0) throw new AppException(ErrorCode.INSUFFICIENT_BALANCE);
        user.setWalletBalance(balance);
        entries.save(
                WalletEntry.builder()
                        .ownerId(owner)
                        .amount(amount)
                        .balanceAfter(balance)
                        .dedupeKey(key)
                        .kind(kind)
                        .description(description)
                        .occurredAt(Instant.now())
                        .build());
    }

    @Transactional
    public WalletTopUp prepare(UUID owner, BigDecimal amount, UUID requestId) {
        User user =
                users.lockById(owner).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!user.isActive()) throw new AppException(ErrorCode.USER_DISABLED);
        var prior = topUps.findByOwnerIdAndRequestId(owner, requestId);
        if (prior.isPresent()) {
            if (prior.get().getAmount().compareTo(amount) != 0)
                throw new AppException(ErrorCode.PAYMENT_MISMATCH);
            return prior.get();
        }
        PlatformSettings s = settings.get();
        if (!s.isTopUpEnabled()) throw new AppException(ErrorCode.PAYMENT_NOT_CONFIGURED);
        if (amount.scale() > 0
                || amount.compareTo(BigDecimal.valueOf(s.getMinTopUp())) < 0
                || amount.compareTo(BigDecimal.valueOf(s.getMaxTopUp())) > 0)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        return topUps.saveAndFlush(
                WalletTopUp.builder()
                        .ownerId(owner)
                        .requestId(requestId)
                        .amount(amount)
                        .status("CREATED")
                        .createdAt(Instant.now())
                        .build());
    }

    @Transactional
    public WalletTopUp attach(long code, String url, String linkId) {
        WalletTopUp t =
                topUps.lockById(code)
                        .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_MISMATCH));
        if (t.getPaymentLinkId() != null && !t.getPaymentLinkId().equals(linkId))
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        t.setPaymentLinkId(linkId);
        t.setCheckoutUrl(url);
        if (t.getCreditedAt() == null) t.setStatus("PENDING");
        return t;
    }

    @Transactional
    public void settle(long code, String linkId, BigDecimal amount, String state) {
        WalletTopUp t =
                topUps.lockById(code)
                        .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_MISMATCH));
        if (t.getAmount().compareTo(amount) != 0
                || (t.getPaymentLinkId() != null && !t.getPaymentLinkId().equals(linkId)))
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        if (t.getCreditedAt() != null) return;
        if ("PAID".equals(state)) {
            change(
                    t.getOwnerId(),
                    t.getAmount(),
                    "TOPUP:" + code,
                    "TOPUP",
                    "Nạp tiền payOS #" + code);
            t.setPaymentLinkId(linkId);
            t.setCreditedAt(Instant.now());
            t.setStatus("PAID");
        } else if ("CANCELLED".equals(state) || "EXPIRED".equals(state)) t.setStatus(state);
    }
}
