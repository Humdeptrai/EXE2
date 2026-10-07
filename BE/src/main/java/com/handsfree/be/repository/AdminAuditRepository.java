package com.handsfree.be.repository;

import com.handsfree.be.entity.AdminAudit;

import java.util.UUID;

public interface AdminAuditRepository
        extends org.springframework.data.jpa.repository.JpaRepository<AdminAudit, UUID> {}
