package com.handsfree.be.repository;

import com.handsfree.be.entity.WalletEntry;

import java.util.UUID;

public interface WalletEntryRepository
        extends org.springframework.data.jpa.repository.JpaRepository<WalletEntry, UUID> {
    boolean existsByDedupeKey(String key);

    org.springframework.data.domain.Page<WalletEntry> findByOwnerIdOrderByOccurredAtDesc(
            UUID id, org.springframework.data.domain.Pageable page);
}
