package com.handsfree.be.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "report_evidence", indexes = @Index(name = "idx_report_evidence_report", columnList = "report_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportEvidence {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id", nullable = false)
    private ModerationReport report;
    @Column(nullable = false, length = 255)
    private String originalName;
    @Column(nullable = false, length = 80)
    private String contentType;
    @Column(nullable = false)
    private long sizeBytes;
    @Column(nullable = false, length = 20)
    private String storageProvider;
    @Column(nullable = false, length = 600)
    private String storageKey;
    @Column(nullable = false)
    private Instant createdAt;
}
