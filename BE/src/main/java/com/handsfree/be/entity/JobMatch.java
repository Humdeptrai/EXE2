package com.handsfree.be.entity;

import com.handsfree.be.base.BaseEntity;
import com.handsfree.be.constant.MatchStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "job_matches", uniqueConstraints = {
        @UniqueConstraint(name = "uk_job_matches_job_provider", columnNames = {"job_id", "provider_id"}),
        @UniqueConstraint(name = "uk_job_matches_interest", columnNames = "job_interest_id")
}, indexes = {
        @Index(name = "idx_job_matches_job_status", columnList = "job_id,status"),
        @Index(name = "idx_job_matches_consumer_status", columnList = "consumer_id,status"),
        @Index(name = "idx_job_matches_provider_status", columnList = "provider_id,status"),
        @Index(name = "idx_job_matches_consumer_connection", columnList = "consumer_id,connection_succeeded_at"),
        @Index(name = "idx_job_matches_provider_connection", columnList = "provider_id,connection_succeeded_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobMatch extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "job_match_id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPost jobPost;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consumer_id", nullable = false)
    private User consumer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private User provider;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_interest_id", nullable = false)
    private JobInterest jobInterest;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MatchStatus status;

    @Column(name = "matched_at", nullable = false)
    private Instant matchedAt;

    @Column(name = "payment_deadline_at")
    private Instant paymentDeadlineAt;

    @Column(name = "expected_end_at")
    private Instant expectedEndAt;

    @Column(name = "rating_opens_at")
    private Instant ratingOpensAt;

    @Column(name = "rating_closes_at")
    private Instant ratingClosesAt;

    @Column(name = "consumer_rating_dismissed_at")
    private Instant consumerRatingDismissedAt;

    @Column(name = "provider_rating_dismissed_at")
    private Instant providerRatingDismissedAt;

    @Column(name = "disconnected_at")
    private Instant disconnectedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "connection_succeeded_at")
    private Instant connectionSucceededAt;

    @Column(name = "chat_unlocked_at")
    private Instant chatUnlockedAt;
}
