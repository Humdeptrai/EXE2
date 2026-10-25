package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="identity_claims") @Getter @Setter @NoArgsConstructor
public class IdentityClaim {
    @Id @Column(length=64) private String documentKey;
    @Column(nullable=false) private UUID ownerId;
    @Column(columnDefinition="bytea") private byte[] faceVector;
    @Column(length=64) private String frontDigest;
    @Column(length=64) private String backDigest;
    @Column(nullable=false) private boolean legacyConflict;
    @Column(nullable=false) private Instant createdAt;
    private Instant indexAttemptAt;
    @Version private long version;
}
