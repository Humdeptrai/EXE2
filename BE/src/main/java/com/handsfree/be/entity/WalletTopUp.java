package com.handsfree.be.entity;

import jakarta.persistence.*;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "wallet_topups",
        uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "request_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletTopUp {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "wallet_order_seq")
    @SequenceGenerator(
            name = "wallet_order_seq",
            sequenceName = "wallet_order_seq",
            initialValue = 100000,
            allocationSize = 1)
    private Long orderCode;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "request_id", nullable = false)
    private UUID requestId;

    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(length = 1000)
    private String checkoutUrl;

    @Column(length = 100)
    private String paymentLinkId;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant creditedAt;
}
