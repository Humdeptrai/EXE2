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
    @Query(value="select i from IdentityVerification i left join IdentitySubmission s on s.userId=i.userId left join User u on u.id=i.userId where (:state='' or coalesce(s.status,i.status)=:state) and (:q='' or lower(u.fullName) like :q escape '!' or lower(cast(i.userId as string)) like :q escape '!') order by coalesce(s.submittedAt,i.submittedAt) desc, i.userId",
           countQuery="select count(i) from IdentityVerification i left join IdentitySubmission s on s.userId=i.userId left join User u on u.id=i.userId where (:state='' or coalesce(s.status,i.status)=:state) and (:q='' or lower(u.fullName) like :q escape '!' or lower(cast(i.userId as string)) like :q escape '!')")
    org.springframework.data.domain.Page<State> searchQueue(@Param("state") String state,@Param("q") String q,org.springframework.data.domain.Pageable page);
    @Query("""
        select i.version as version, i.status as status, i.reason as reason, i.submittedAt as submittedAt, i.verifiedAt as verifiedAt,
            i.selfieVerifiedAt as selfieVerifiedAt, i.documentNumberConfirmedAt as documentNumberConfirmedAt,
            i.documentNumber as documentNumber, i.fullName as fullName,
            (i.selfieImage is not null) as hasSelfie, (i.faceImage is not null) as hasFace,
            (i.frontImage is not null) as hasFront, (i.backImage is not null) as hasBack
        from IdentityVerification i where i.userId = :id
        """)
    Optional<IdentityReadModel> findReadModel(@Param("id") UUID id);

    @Query("""
        select case :kind when 'face' then i.faceImage when 'front' then i.frontImage
            when 'back' then i.backImage when 'selfie' then i.selfieImage else null end as data
        from IdentityVerification i where i.userId = :id
        """)
    Optional<IdentityImageData> findImageData(@Param("id") UUID id, @Param("kind") String kind);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from IdentityVerification i where i.userId = :id")
    Optional<IdentityVerification> lockById(@Param("id") UUID id);
}
