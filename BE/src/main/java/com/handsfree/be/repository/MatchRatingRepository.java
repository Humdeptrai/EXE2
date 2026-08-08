package com.handsfree.be.repository;

import com.handsfree.be.constant.UserMode;
import com.handsfree.be.entity.MatchRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchRatingRepository extends JpaRepository<MatchRating, UUID> {
    Optional<MatchRating> findByJobMatch_IdAndRater_Id(UUID matchId, UUID raterId);

    @Query("""
            select avg(r.stars), count(r)
            from MatchRating r
            where r.ratedUser.id = :userId
            """)
    Object[] aggregateOverall(@Param("userId") UUID userId);

    @Query("""
            select avg(r.stars), count(r)
            from MatchRating r
            where r.ratedUser.id = :userId
              and r.ratedAsMode = :mode
            """)
    Object[] aggregateByMode(@Param("userId") UUID userId, @Param("mode") UserMode mode);

    @Query("""
            select r.ratedUser.id, avg(r.stars), count(r)
            from MatchRating r
            where r.ratedUser.id in :userIds
              and r.ratedAsMode = :mode
            group by r.ratedUser.id
            """)
    List<Object[]> aggregateByModeForUsers(
            @Param("userIds") Collection<UUID> userIds,
            @Param("mode") UserMode mode
    );
}
