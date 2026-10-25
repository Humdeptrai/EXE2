package com.handsfree.be.repository;

import com.handsfree.be.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);
    @org.springframework.data.jpa.repository.Query("select t.user.id from RefreshToken t where t.tokenHash=:hash and t.revokedAt is null")
    java.util.Optional<java.util.UUID> findOwner(@org.springframework.data.repository.query.Param("hash") String hash);
    void deleteAllByUserId(UUID userId);
}
