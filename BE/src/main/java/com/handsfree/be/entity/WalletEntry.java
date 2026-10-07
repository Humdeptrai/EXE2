package com.handsfree.be.entity;

import jakarta.persistence.*;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "wallet_entries",
        uniqueConstraints = @UniqueConstraint(columnNames = "dedupe_key"),
        indexes = @Index(name = "idx_wallet_entries_owner", columnList = "owner_id,occurred_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal amount;

    @Column(nullable = false, precision = 18, scale = 0)
    private BigDecimal balanceAfter;

    @Column(nullable = false, length = 30)
    private String kind;

    @Column(name = "dedupe_key", nullable = false, length = 160)
    private String dedupeKey;

    @Column(length = 160)
    private String description;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
