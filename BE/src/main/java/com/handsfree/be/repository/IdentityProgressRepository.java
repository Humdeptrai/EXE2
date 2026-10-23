package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentityProgress;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IdentityProgressRepository extends JpaRepository<IdentityProgress,UUID> {
    interface Snapshot {
        boolean getHasCheckpoint(); boolean getHasSelfie(); boolean getHasFront(); boolean getHasBack();
        boolean getSelfiePassed(); boolean getFrontPassed(); boolean getBackPassed();
        String getFrontReason(); String getBackReason(); String getStatus(); byte[] getDocumentNumber();
        java.time.Instant getUpdatedAt(); long getVersion();
    }
    @Query("""
        select (p.checkpoint is not null) as hasCheckpoint, (p.selfieImage is not null) as hasSelfie,
            (p.frontImage is not null) as hasFront, (p.backImage is not null) as hasBack,
            p.selfiePassed as selfiePassed, p.frontPassed as frontPassed, p.backPassed as backPassed,
            p.frontReason as frontReason, p.backReason as backReason, p.status as status,
            p.documentNumber as documentNumber, p.updatedAt as updatedAt, p.version as version
        from IdentityProgress p where p.userId = :id
        """)
    Optional<Snapshot> findSnapshot(@Param("id") UUID id);
    @Query("""
        select case :kind when 'face' then p.faceImage when 'front' then p.frontImage
            when 'back' then p.backImage when 'selfie' then p.selfieImage else null end as data
        from IdentityProgress p where p.userId = :id
        """)
    Optional<IdentityImageData> findImageData(@Param("id") UUID id, @Param("kind") String kind);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from IdentityProgress p where p.userId=:id")
    Optional<IdentityProgress> lockById(@Param("id") UUID id);
}
