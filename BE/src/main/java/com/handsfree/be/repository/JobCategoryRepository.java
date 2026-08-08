package com.handsfree.be.repository;

import com.handsfree.be.entity.JobCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobCategoryRepository extends JpaRepository<JobCategory, UUID> {
    List<JobCategory> findAllByActiveTrueOrderByDisplayOrderAsc();

    Optional<JobCategory> findByIdAndActiveTrue(UUID id);

    boolean existsByCode(String code);
}
