package com.handsfree.be.repository;

import com.handsfree.be.entity.JobMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobMediaRepository extends JpaRepository<JobMedia, UUID> {
    Optional<JobMedia> findByIdAndJobPost_IdAndJobPost_Owner_Id(UUID id, UUID jobId, UUID ownerId);
}
