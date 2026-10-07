package com.handsfree.be.repository;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.entity.JobInterest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobInterestRepository extends JpaRepository<JobInterest, UUID> {
    Optional<JobInterest> findByApplicant_IdAndJobPost_Id(UUID applicantId, UUID jobId);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.category", "jobPost.owner"})
    Page<JobInterest> findAllByApplicant_IdAndLevelAndStatusAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqualOrderByUpdatedAtDesc(
            UUID applicantId,
            InterestLevel level,
            InterestStatus status,
            JobStatus jobStatus,
            LocalDate today,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"applicant", "jobPost"})
    @Query("""
            select interest
            from JobInterest interest
            where interest.jobPost.id = :jobId
              and interest.jobPost.owner.id = :ownerId
              and interest.status = :status
            order by case when interest.level = :priorityLevel then 0 else 1 end,
                     interest.createdAt asc
            """)
    Page<JobInterest> findCandidateQueue(
            @Param("ownerId") UUID ownerId,
            @Param("jobId") UUID jobId,
            @Param("status") InterestStatus status,
            @Param("priorityLevel") InterestLevel priorityLevel,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"applicant", "jobPost", "jobPost.owner"})
    Optional<JobInterest> findByIdAndJobPost_IdAndJobPost_Owner_Id(UUID id, UUID jobId, UUID ownerId);

    long countByApplicant_IdAndLevelAndStatusAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
            UUID applicantId,
            InterestLevel level,
            InterestStatus status,
            JobStatus jobStatus,
            LocalDate today
    );

    long countByJobPost_IdAndStatus(UUID jobId, InterestStatus status);

    long countByJobPost_IdAndStatusIn(UUID jobId, Collection<InterestStatus> statuses);

    void deleteAllByJobPost_Id(UUID jobId);
}
