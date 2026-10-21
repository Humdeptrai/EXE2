package com.handsfree.be.repository;
import com.handsfree.be.entity.ProfileSkill;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import java.util.*;
public interface ProfileSkillRepository extends JpaRepository<ProfileSkill, UUID> {
    List<ProfileSkill> findByStatusOrderByNameAsc(String status);
    List<ProfileSkill> findTop50BySubmittedBy_IdOrderByCreatedAtDesc(UUID user);
    Optional<ProfileSkill> findByNormalizedName(String key);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from ProfileSkill s where s.id=:id")
    Optional<ProfileSkill> lock(@Param("id") UUID id);
    @Query("select s from ProfileSkill s where (:status='' or s.status=:status) and lower(s.name) like :search escape '!' order by s.createdAt desc, s.id")
    Page<ProfileSkill> search(@Param("status") String status, @Param("search") String search, Pageable page);
}
