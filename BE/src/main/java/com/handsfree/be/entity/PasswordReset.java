package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="password_resets") @Getter @Setter @NoArgsConstructor
public class PasswordReset {
 @Id @Column(length=64) private String tokenHash;
 @Column(nullable=false) private UUID userId;
 @Column(nullable=false) private Instant createdAt;
 @Column(nullable=false) private Instant expiresAt;
 private Instant consumedAt;
}
