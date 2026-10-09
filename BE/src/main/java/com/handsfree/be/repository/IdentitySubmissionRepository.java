package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentitySubmission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IdentitySubmissionRepository extends JpaRepository<IdentitySubmission, UUID> {
    interface State { java.time.Instant getSubmittedAt(); String getReason(); String getStatus(); }
    Optional<State> findStateByUserId(UUID user);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IdentitySubmission i where i.userId = :id")
    Optional<IdentitySubmission> lockById(@Param("id") UUID id);
}
