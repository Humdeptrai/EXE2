package com.handsfree.be.repository;

import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.entity.JobMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobMatchRepository extends JpaRepository<JobMatch, UUID> {
    @Query("select m.id from JobMatch m where m.status = :status and m.paymentDeadlineAt <= :now and m.connectionSucceededAt is null order by m.paymentDeadlineAt")
    List<UUID> findDueIds(@Param("status") MatchStatus status, @Param("now") java.time.Instant now, Pageable page);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from JobMatch m where m.id = :id")
    java.util.Optional<JobMatch> lockForAdmin(@org.springframework.data.repository.query.Param("id") UUID id);
    boolean existsByJobPost_Id(UUID jobId);

    long countByJobPost_IdAndStatus(UUID jobId, MatchStatus status);

    long countByProvider_IdAndStatus(UUID providerId, MatchStatus status);

    @Query("""
            select count(jm)
            from JobMatch jm
            where jm.connectionSucceededAt is not null
              and (jm.consumer.id = :userId or jm.provider.id = :userId)
            """)
    long countSuccessfulConnections(@Param("userId") UUID userId);

    @Query("""
            select count(jm)
            from JobMatch jm
            where jm.connectionSucceededAt is not null
              and jm.consumer.id = :userId
            """)
    long countSuccessfulConnectionsAsConsumer(@Param("userId") UUID userId);

    @Query("""
            select count(jm)
            from JobMatch jm
            where jm.connectionSucceededAt is not null
              and jm.provider.id = :userId
            """)
    long countSuccessfulConnectionsAsProvider(@Param("userId") UUID userId);

    @Query("""
            select jm.provider.id,
                   jm.jobPost.category.id,
                   jm.jobPost.category.code,
                   jm.jobPost.category.name,
                   jm.jobPost.category.icon,
                   count(jm)
            from JobMatch jm
            where jm.connectionSucceededAt is not null
              and jm.provider.id in :providerIds
            group by jm.provider.id,
                     jm.jobPost.category.id,
                     jm.jobPost.category.code,
                     jm.jobPost.category.name,
                     jm.jobPost.category.icon
            """)
    List<Object[]> summarizeSuccessfulExpertise(@Param("providerIds") Collection<UUID> providerIds);

    Optional<JobMatch> findByJobInterest_Id(UUID interestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select jm
            from JobMatch jm
            where jm.id = :matchId
              and (jm.consumer.id = :userId or jm.provider.id = :userId)
            """)
    Optional<JobMatch> findParticipantMatchForUpdate(@Param("matchId") UUID matchId, @Param("userId") UUID userId);

    @Query("""
            select jm.id
            from JobMatch jm
            where jm.connectionSucceededAt is not null
              and jm.chatUnlockedAt is not null
              and jm.status = :status
              and (jm.consumer.id = :userId or jm.provider.id = :userId)
              and not exists (
                    select conversation.id
                    from ChatConversation conversation
                    where conversation.jobMatch = jm
              )
            """)
    List<UUID> findConnectedMatchIdsWithoutConversation(
            @Param("userId") UUID userId,
            @Param("status") MatchStatus status
    );

    @EntityGraph(attributePaths = {"jobPost", "jobPost.category", "consumer", "provider"})
    Page<JobMatch> findAllByProvider_IdAndStatusOrderByMatchedAtDesc(
            UUID providerId,
            MatchStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"jobPost", "jobPost.category", "consumer", "provider"})
    Page<JobMatch> findAllByConsumer_IdAndStatusOrderByMatchedAtDesc(
            UUID consumerId,
            MatchStatus status,
            Pageable pageable
    );
}
