package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="identity_appeals") @Getter @Setter
public class IdentityAppeal {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID userId;
    @Column(nullable=false,length=20) private String status;
    @Column(length=500) private String note;
    @Column(length=500) private String reason;
    @Column(nullable=false) private Instant createdAt;
    private Instant resolvedAt;
    private Instant claimedAt;
    private UUID claimedBy;
    private Instant submissionAt;
    private Double similarity;
    @Column(columnDefinition="bytea") private byte[] fullName;
    @Column(columnDefinition="bytea") private byte[] documentNumber;
    @Column(columnDefinition="bytea") private byte[] documentData;
    @Column(columnDefinition="bytea") private byte[] frontImage;
    @Column(columnDefinition="bytea") private byte[] backImage;
    @Column(columnDefinition="bytea") private byte[] faceImage;
    @Column(columnDefinition="bytea") private byte[] selfieImage;
    @Version private long version;
}
