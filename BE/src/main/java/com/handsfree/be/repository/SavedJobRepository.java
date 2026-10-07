package com.handsfree.be.repository;

import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.entity.SavedJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SavedJobRepository extends JpaRepository<SavedJob, UUID> {
    Optional<SavedJob> findByUser_IdAndJobPost_Id(UUID userId, UUID jobId);

    boolean existsByUser_IdAndJobPost_Id(UUID userId, UUID jobId);

    @EntityGraph(attributePaths = {"jobPost", "jobPost.category", "jobPost.owner"})
    Page<SavedJob> findAllByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqualOrderByCreatedAtDesc(
            UUID userId,
            JobStatus status,
            LocalDate today,
            Pageable pageable
    );

    long countByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
            UUID userId,
            JobStatus status,
            LocalDate today
    );

    void deleteAllByJobPost_Id(UUID jobId);
}
