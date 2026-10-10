package com.handsfree.be.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="identity_progress") @Getter @Setter
public class IdentityProgress {
    @Id private UUID userId;
    @Column(columnDefinition="bytea") private byte[] checkpoint;
    @Column(columnDefinition="bytea") private byte[] faceImage;
    @Column(columnDefinition="bytea") private byte[] selfieImage;
    @Column(columnDefinition="bytea") private byte[] frontImage;
    @Column(columnDefinition="bytea") private byte[] backImage;
    @Column(columnDefinition="bytea") private byte[] documentNumber;
    @Column(nullable=false) private boolean selfiePassed;
    @Column(nullable=false) private boolean frontPassed;
    @Column(nullable=false) private boolean backPassed;
    @Column(length=500) private String frontReason;
    @Column(length=500) private String backReason;
    @Column(length=30) private String status;
    private Instant updatedAt;
    @Version private long version;
}
