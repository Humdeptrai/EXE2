package com.handsfree.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name="registration_email_otps", indexes=@Index(name="idx_registration_email_otp_sent", columnList="sent_at")) @Getter @Setter @NoArgsConstructor
public class RegistrationEmailOtp {
    @Id @Column(length=254) private String email;
    @Column(length=64) private String codeHash;
    @Column(length=36) private String nonce;
    private Instant expiresAt;
    private Instant sentAt;
    private Instant consumedAt;
    private Instant windowStartedAt;
    @Column(nullable=false) private int sendCount;
    @Column(nullable=false) private int failedAttempts;
}
