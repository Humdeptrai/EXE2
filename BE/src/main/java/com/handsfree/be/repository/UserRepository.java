package com.handsfree.be.repository;

import com.handsfree.be.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.id = :id")
    Optional<User> lockById(@org.springframework.data.repository.query.Param("id") UUID id);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, UUID id);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByPhone(String phone);
    Optional<User> findByGoogleSubject(String googleSubject);
    Optional<User> findByIdAndActiveTrue(UUID id);
}
