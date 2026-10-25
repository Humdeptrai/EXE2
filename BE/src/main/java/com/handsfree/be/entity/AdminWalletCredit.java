package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.Instant;
@Entity @Table(name="admin_wallet_credits") @Getter @Setter @NoArgsConstructor
public class AdminWalletCredit {
 @Id private UUID requestId;
 @Column(nullable=false) private UUID actorId;
 @Column(nullable=false) private UUID ownerId;
 @Column(nullable=false,precision=18,scale=0) private BigDecimal amount;
 @Column(nullable=false,precision=18,scale=0) private BigDecimal balanceAfter;
 @Column(nullable=false,length=1000) private String reason;
 private Long orderCode;
 private UUID reportId;
 @Column(nullable=false) private Instant createdAt;
}
