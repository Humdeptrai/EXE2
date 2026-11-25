package com.handsfree.be.repository;

import com.handsfree.be.entity.RegistrationEmailOtp;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface RegistrationEmailOtpRepository extends JpaRepository<RegistrationEmailOtp,String> {
    @Modifying @Query("delete from RegistrationEmailOtp o where o.sentAt < :cutoff")
    int deleteOld(@Param("cutoff") java.time.Instant cutoff);
    @Modifying @Query(value="insert into registration_email_otps(email,send_count,failed_attempts) values(:email,0,0) on conflict do nothing", nativeQuery=true)
    void initialize(@Param("email") String email);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from RegistrationEmailOtp o where o.email=:email")
    Optional<RegistrationEmailOtp> lockByEmail(@Param("email") String email);
}
