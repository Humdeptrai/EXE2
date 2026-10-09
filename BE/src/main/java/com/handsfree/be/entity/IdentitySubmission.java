package com.handsfree.be.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "identity_submissions") @Getter @Setter @NoArgsConstructor
public class IdentitySubmission {
    @Id private UUID userId;
    @Column(nullable = false, length = 20) private String status;
    @Column(length = 500) private String reason;
    private Instant submittedAt;
    private Instant verifiedAt;
    private Instant consentAt;
    private Double similarity;
    private Boolean live;
    // AES-GCM ciphertext only. Never expose this entity from a controller.
    @Column(columnDefinition = "bytea") private byte[] fullName;
    @Column(columnDefinition = "bytea") private byte[] documentData;
    @Column(columnDefinition = "bytea") private byte[] frontImage;
    @Column(columnDefinition = "bytea") private byte[] backImage;
    @Column(columnDefinition = "bytea") private byte[] faceImage;
    @Column(columnDefinition = "bytea") private byte[] selfieImage;
    private Instant selfieVerifiedAt;
    @Column(columnDefinition = "bytea") private byte[] documentNumber;
    private Instant documentNumberConfirmedAt;
    @Version private long version;
}
