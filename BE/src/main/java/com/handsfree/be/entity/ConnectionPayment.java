package com.handsfree.be.entity;

import com.handsfree.be.base.BaseEntity;
import com.handsfree.be.constant.PaymentMethod;
import com.handsfree.be.constant.PaymentStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "connection_payments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_connection_payments_match", columnNames = "job_match_id")
}, indexes = {
        @Index(name = "idx_connection_payments_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionPayment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "connection_payment_id", nullable = false, updatable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_match_id", nullable = false)
    private JobMatch jobMatch;

    @Column(name = "consumer_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal consumerFee;

    @Column(name = "provider_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal providerFee;

    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 0)
    private BigDecimal platformFee;

    /**
     * Overall payment state. PAID means both sides have paid and the connection is successful.
     * The legacy payment_method/paid_at columns are kept for schema compatibility; paidAt now
     * represents the time the two-sided connection payment became complete.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "consumer_payment_status", length = 20)
    private PaymentStatus consumerPaymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_payment_status", length = 20)
    private PaymentStatus providerPaymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "consumer_payment_method", length = 30)
    private PaymentMethod consumerPaymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_payment_method", length = 30)
    private PaymentMethod providerPaymentMethod;

    @Column(name = "consumer_paid_at")
    private Instant consumerPaidAt;

    @Column(name = "provider_paid_at")
    private Instant providerPaidAt;

    @Column(name = "refunded_at")
    private Instant refundedAt;
}
