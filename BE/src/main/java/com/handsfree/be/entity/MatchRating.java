package com.handsfree.be.entity;

import com.handsfree.be.base.BaseEntity;
import com.handsfree.be.constant.UserMode;
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
@Table(name = "match_ratings", uniqueConstraints = {
        @UniqueConstraint(name = "uk_match_ratings_match_rater", columnNames = {"job_match_id", "rater_id"})
}, indexes = {
        @Index(name = "idx_match_ratings_rated_user", columnList = "rated_user_id"),
        @Index(name = "idx_match_ratings_rated_user_mode", columnList = "rated_user_id,rated_as_mode")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchRating extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "match_rating_id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_match_id", nullable = false)
    private JobMatch jobMatch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rater_id", nullable = false)
    private User rater;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rated_user_id", nullable = false)
    private User ratedUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "rated_as_mode", nullable = false, length = 20)
    private UserMode ratedAsMode;

    @Column(name = "stars", nullable = false)
    private int stars;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "rated_at", nullable = false)
    private Instant ratedAt;
}
