package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentitySubmission;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IdentitySubmissionRepository extends JpaRepository<IdentitySubmission, UUID> {
    interface State { java.time.Instant getSubmittedAt(); String getReason(); String getStatus(); }
    Optional<State> findStateByUserId(UUID user);
    @Query("""
        select i.version as version, i.status as status, i.reason as reason, i.submittedAt as submittedAt, i.verifiedAt as verifiedAt,
            i.selfieVerifiedAt as selfieVerifiedAt, i.documentNumberConfirmedAt as documentNumberConfirmedAt,
            i.documentNumber as documentNumber, i.fullName as fullName,
            (i.selfieImage is not null) as hasSelfie, (i.faceImage is not null) as hasFace,
            (i.frontImage is not null) as hasFront, (i.backImage is not null) as hasBack
        from IdentitySubmission i where i.userId = :id
        """)
    Optional<IdentityReadModel> findReadModel(@Param("id") UUID id);

    @Query("""
        select case :kind when 'face' then i.faceImage when 'front' then i.frontImage
            when 'back' then i.backImage when 'selfie' then i.selfieImage else null end as data
        from IdentitySubmission i where i.userId = :id
        """)
    Optional<IdentityImageData> findImageData(@Param("id") UUID id, @Param("kind") String kind);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IdentitySubmission i where i.userId = :id")
    Optional<IdentitySubmission> lockById(@Param("id") UUID id);
}
