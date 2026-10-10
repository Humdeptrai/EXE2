package com.handsfree.be.repository;

import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.entity.JobPost;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobPostRepository extends JpaRepository<JobPost, UUID>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<JobPost> {
    @EntityGraph(attributePaths = {"category"})
    Page<JobPost> findAllByOwner_IdAndStatusIn(UUID ownerId, Collection<JobStatus> statuses, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "media"})
    Optional<JobPost> findByIdAndOwner_Id(UUID id, UUID ownerId);

    @EntityGraph(attributePaths = {"category", "owner"})
    @Query("""
            select job
            from JobPost job
            where job.id = :jobId
            """)
    Optional<JobPost> findDiscoveryById(@Param("jobId") UUID jobId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select job
            from JobPost job
            where job.id = :jobId
              and job.owner.id = :ownerId
            """)
    Optional<JobPost> findOwnedForMatchingUpdate(
            @Param("ownerId") UUID ownerId,
            @Param("jobId") UUID jobId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select job
            from JobPost job
            where job.id = :jobId
            """)
    Optional<JobPost> findDiscoveryForUpdate(@Param("jobId") UUID jobId);

    @EntityGraph(attributePaths = {"category", "owner"})
    @Query("""
            select job
            from JobPost job
            where job.status = :status
              and job.moderationHidden = false
              and job.owner.id <> :userId
              and job.scheduledDate >= :today
              and (:categoryId is null or job.category.id = :categoryId)
              and (:keyword = ''
                   or lower(job.title) like concat('%', :keyword, '%')
                   or lower(job.description) like concat('%', :keyword, '%')
                   or lower(job.location) like concat('%', :keyword, '%'))
              and (:location = '' or lower(job.location) like concat('%', :location, '%'))
              and (:minBudget is null or job.budgetAmount >= :minBudget)
              and (:maxBudget is null or job.budgetAmount <= :maxBudget)
              and (select count(jm.id)
                   from JobMatch jm
                   where jm.jobPost.id = job.id
                     and jm.status = :activeMatchStatus) < job.requiredWorkers
              and not exists (
                    select skipped.id
                    from SkippedJob skipped
                    where skipped.user.id = :userId
                      and skipped.jobPost.id = job.id
              )
              and not exists (
                    select interest.id
                    from JobInterest interest
                    where interest.applicant.id = :userId
                      and interest.jobPost.id = job.id
                      and interest.status in :hiddenInterestStatuses
              )
            """)
    Page<JobPost> findDiscoveryFeed(
            @Param("userId") UUID userId,
            @Param("status") JobStatus status,
            @Param("today") LocalDate today,
            @Param("categoryId") UUID categoryId,
            @Param("keyword") String keyword,
            @Param("location") String location,
            @Param("minBudget") BigDecimal minBudget,
            @Param("maxBudget") BigDecimal maxBudget,
            @Param("hiddenInterestStatuses") Collection<InterestStatus> hiddenInterestStatuses,
            @Param("activeMatchStatus") MatchStatus activeMatchStatus,
            Pageable pageable
    );

    long countByOwner_IdAndStatus(UUID ownerId, JobStatus status);

    long countByOwner_IdAndStatusIn(UUID ownerId, Collection<JobStatus> statuses);
}
