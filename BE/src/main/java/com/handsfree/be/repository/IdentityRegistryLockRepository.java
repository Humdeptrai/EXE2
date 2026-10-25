package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentityRegistryLock;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
public interface IdentityRegistryLockRepository extends JpaRepository<IdentityRegistryLock,Integer> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select l from IdentityRegistryLock l where l.id=1")
 java.util.Optional<IdentityRegistryLock> lock();
}
