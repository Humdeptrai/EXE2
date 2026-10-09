package com.handsfree.be.entity;

import jakarta.persistence.*;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "moderation_reports")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationReport {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID reporterId;

    @Column(nullable = false, length = 10)
    private String targetType;

    @Column(nullable = false)
    private UUID targetId;

    @Column(nullable = false, length = 2000)
    private String reason;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(length = 2000)
    private String resolution;

    private UUID resolvedBy;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant resolvedAt;

    private UUID assignedTo;
    private Instant assignedAt;

    @Version
    private long version;

    @ElementCollection
    @CollectionTable(name = "report_links", joinColumns = @JoinColumn(name = "report_id"))
    @OrderColumn(name = "link_index")
    @Column(name = "url", nullable = false, length = 2000)
    @Builder.Default
    private java.util.List<String> links = new java.util.ArrayList<>();
}
