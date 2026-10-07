package com.handsfree.be.repository;

import com.handsfree.be.entity.IdentityVerification;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IdentityRepository extends JpaRepository<IdentityVerification, UUID> {
    interface State {
        UUID getUserId(); String getStatus(); String getReason();
        java.time.Instant getSubmittedAt(); java.time.Instant getVerifiedAt();
    }
    interface PublicIdentity { String getStatus(); byte[] getFullName(); }
    Optional<State> findStateByUserId(UUID id);
    Optional<PublicIdentity> findPublicByUserId(UUID id);
    boolean existsByUserIdAndStatus(UUID id, String status);
    org.springframework.data.domain.Page<State> findAllProjectedBy(org.springframework.data.domain.Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IdentityVerification i where i.userId = :id")
    Optional<IdentityVerification> lockById(@Param("id") UUID id);
}
