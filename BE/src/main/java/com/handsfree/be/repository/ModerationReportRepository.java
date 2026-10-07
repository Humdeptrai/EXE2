package com.handsfree.be.repository;

import com.handsfree.be.entity.ModerationReport;

import java.util.UUID;

public interface ModerationReportRepository
        extends org.springframework.data.jpa.repository.JpaRepository<ModerationReport, UUID> {
    org.springframework.data.domain.Page<ModerationReport> findByReporterIdOrderByCreatedAtDesc(
            UUID id, org.springframework.data.domain.Pageable page);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select r from ModerationReport r where r.id=:id")
    java.util.Optional<ModerationReport> lockById(
            @org.springframework.data.repository.query.Param("id") UUID id);
}
