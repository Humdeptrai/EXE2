package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MatchExpiryService {
    private final JobMatchRepository matches;
    private final ConnectionPaymentRepository payments;
    private final WalletEntryRepository entries;
    private final WalletService wallet;
    private final NotificationService notifications;

    public static boolean due(JobMatch m, Instant now) {
        return m.getStatus() == MatchStatus.ACTIVE && m.getConnectionSucceededAt() == null
                && m.getPaymentDeadlineAt() != null && !now.isBefore(m.getPaymentDeadlineAt());
    }

    @Transactional
    public void expire(UUID id) {
        matches.lockForAdmin(id).ifPresent(this::expireLocked);
    }

    // Called only while holding the same matching row lock used by payment/admin refund.
    public boolean expireLocked(JobMatch m) {
        if (!due(m, Instant.now())) return false;
        var p = payments.findByJobMatch_Id(m.getId()).orElse(null);
        if (p != null && p.getStatus() != PaymentStatus.REFUNDED) {
            // Same key and wallet-lock order as manual refunds: cannot credit twice.
            var owners = new ArrayList<>(List.of(m.getConsumer().getId(), m.getProvider().getId()));
            owners.sort(Comparator.comparing(UUID::toString));
            for (UUID owner : owners) {
                boolean consumer = owner.equals(m.getConsumer().getId());
                var status = consumer ? p.getConsumerPaymentStatus() : p.getProviderPaymentStatus();
                var method = consumer ? p.getConsumerPaymentMethod() : p.getProviderPaymentMethod();
                if (status == PaymentStatus.PAID && method == PaymentMethod.WALLET
                        && entries.existsByDedupeKey("CONNECT:" + m.getId() + ":" + owner)) {
                    wallet.refund(owner, consumer ? p.getConsumerFee() : p.getProviderFee(),
                            "REFUND:" + m.getId() + ":" + owner);
                    if (consumer) p.setConsumerPaymentStatus(PaymentStatus.REFUNDED);
                    else p.setProviderPaymentStatus(PaymentStatus.REFUNDED);
                }
            }
            p.setStatus(PaymentStatus.REFUNDED);
            p.setRefundedAt(Instant.now());
        }
        m.setStatus(MatchStatus.EXPIRED);
        m.setDisconnectedAt(Instant.now());
        m.setChatUnlockedAt(null);
        m.setConnectionSucceededAt(null);
        for (User user : List.of(m.getConsumer(), m.getProvider())) {
            notifications.create(user, NotificationType.PAYMENT_RECEIVED, "Kết nối hết hạn thanh toán",
                    "Hai bên chưa hoàn tất phí đúng hạn. Khoản phí thực tế đã trả được hoàn về ví.",
                    m.getId(), "/matches/" + m.getId() + "/payment");
        }
        return true;
    }
}
