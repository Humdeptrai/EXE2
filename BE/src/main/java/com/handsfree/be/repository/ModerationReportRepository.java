package com.handsfree.be.repository;

import com.handsfree.be.entity.ModerationReport;

import java.util.UUID;

public interface ModerationReportRepository
        extends org.springframework.data.jpa.repository.JpaRepository<ModerationReport, UUID> {
    @org.springframework.data.jpa.repository.Query("select r from ModerationReport r left join User u on u.id=r.reporterId left join User a on a.id=r.assignedTo where (:state='' or r.status=:state) and (:q='' or lower(u.fullName) like :q escape '!' or lower(a.fullName) like :q escape '!' or lower(r.reason) like :q escape '!' or lower(cast(r.id as string)) like :q escape '!' or lower(cast(r.targetId as string)) like :q escape '!')")
    org.springframework.data.domain.Page<ModerationReport> search(@org.springframework.data.repository.query.Param("q") String q, @org.springframework.data.repository.query.Param("state") String state, org.springframework.data.domain.Pageable page);
    org.springframework.data.domain.Page<ModerationReport> findByReporterIdOrderByCreatedAtDesc(
            UUID id, org.springframework.data.domain.Pageable page);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select r from ModerationReport r where r.id=:id")
    java.util.Optional<ModerationReport> lockById(
            @org.springframework.data.repository.query.Param("id") UUID id);
}
