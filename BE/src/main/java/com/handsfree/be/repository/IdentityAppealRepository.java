package com.handsfree.be.repository;
import com.handsfree.be.entity.IdentityAppeal;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.*;
public interface IdentityAppealRepository extends JpaRepository<IdentityAppeal, UUID> {
    Optional<IdentityAppeal> findFirstByUserIdAndStatusIn(UUID user, Collection<String> states);
    Optional<IdentityAppeal> findFirstByUserIdOrderByCreatedAtDesc(UUID user);
    boolean existsByUserIdAndStatusIn(UUID user, Collection<String> states);
    @Query("select a.userId from IdentityAppeal a where a.id=:id")
    Optional<UUID> findOwner(@Param("id") UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from IdentityAppeal a where a.id=:id")
    Optional<IdentityAppeal> lockById(@Param("id") UUID id);
    @Query("select a from IdentityAppeal a where (:state='' or a.status=:state) and (:search='' or lower(cast(a.userId as string)) like concat('%',:search,'%') or lower(cast(a.id as string)) like concat('%',:search,'%')) order by a.createdAt desc")
    Page<IdentityAppeal> search(@Param("state") String state, @Param("search") String search, Pageable pageable);
}
