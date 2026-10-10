package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentityProgress;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface IdentityProgressRepository extends JpaRepository<IdentityProgress,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from IdentityProgress p where p.userId=:id")
    Optional<IdentityProgress> lockById(@Param("id") UUID id);
}
