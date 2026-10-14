package com.handsfree.be.repository;

import com.handsfree.be.entity.WalletTopUp;

import java.util.UUID;

public interface WalletTopUpRepository
        extends org.springframework.data.jpa.repository.JpaRepository<WalletTopUp, Long>, org.springframework.data.jpa.repository.JpaSpecificationExecutor<WalletTopUp> {
    @org.springframework.data.jpa.repository.Query("select t from WalletTopUp t where t.creditedAt is null "
            + "and t.status in ('CREATED', 'PENDING') and t.orderCode > :after order by t.orderCode")
    java.util.List<WalletTopUp> findUncreditedAfter(
            @org.springframework.data.repository.query.Param("after") long after,
            org.springframework.data.domain.Pageable page);

    java.util.Optional<WalletTopUp> findByOwnerIdAndRequestId(UUID ownerId, UUID requestId);

    org.springframework.data.domain.Page<WalletTopUp> findByOwnerIdOrderByCreatedAtDesc(
            UUID id, org.springframework.data.domain.Pageable page);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select t from WalletTopUp t where t.orderCode = :id")
    java.util.Optional<WalletTopUp> lockById(
            @org.springframework.data.repository.query.Param("id") Long id);
}
