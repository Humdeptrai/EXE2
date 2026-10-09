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
        java.time.Instant getSelfieVerifiedAt(); java.time.Instant getDocumentNumberConfirmedAt();
    }
    interface PublicIdentity { String getStatus(); byte[] getFullName(); java.time.Instant getSelfieVerifiedAt(); }
    Optional<State> findStateByUserId(UUID id);
    Optional<PublicIdentity> findPublicByUserId(UUID id);
    boolean existsByUserIdAndStatus(UUID id, String status);
    org.springframework.data.domain.Page<State> findAllProjectedBy(org.springframework.data.domain.Pageable page);

    @Query(value = "select i from IdentityVerification i left join IdentitySubmission s on s.userId = i.userId order by coalesce(s.submittedAt, i.submittedAt) desc",
           countQuery = "select count(i) from IdentityVerification i")
    org.springframework.data.domain.Page<State> findReviewQueue(org.springframework.data.domain.Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IdentityVerification i where i.userId = :id")
    Optional<IdentityVerification> lockById(@Param("id") UUID id);
}
