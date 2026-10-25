package com.handsfree.be.repository;
import com.handsfree.be.entity.PasswordReset;
import org.springframework.data.jpa.repository.*;
import java.time.Instant;
import java.util.*;
public interface PasswordResetRepository extends JpaRepository<PasswordReset,String> {
 long countByUserIdAndCreatedAtAfter(UUID user,Instant after);
 boolean existsByUserIdAndCreatedAtAfter(UUID user,Instant after);
 @Modifying @Query("update PasswordReset p set p.consumedAt=:now where p.userId=:user and p.consumedAt is null") void consumeAll(UUID user,Instant now);
}
