package com.handsfree.be.repository;

import com.handsfree.be.entity.ChatConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
    @EntityGraph(attributePaths = {"jobMatch", "jobMatch.jobPost", "jobMatch.consumer", "jobMatch.provider"})
    Optional<ChatConversation> findByJobMatch_Id(UUID matchId);

    @EntityGraph(attributePaths = {"jobMatch", "jobMatch.jobPost", "jobMatch.consumer", "jobMatch.provider"})
    @Query("""
            select c
            from ChatConversation c
            where c.id = :conversationId
              and c.jobMatch.connectionSucceededAt is not null
              and c.jobMatch.chatUnlockedAt is not null
              and (c.jobMatch.consumer.id = :userId or c.jobMatch.provider.id = :userId)
            """)
    Optional<ChatConversation> findParticipantConversation(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId
    );

    @EntityGraph(attributePaths = {"jobMatch", "jobMatch.jobPost", "jobMatch.consumer", "jobMatch.provider"})
    @Query(
            value = """
                    select c
                    from ChatConversation c
                    where c.jobMatch.connectionSucceededAt is not null
                      and c.jobMatch.chatUnlockedAt is not null
                      and (c.jobMatch.consumer.id = :userId or c.jobMatch.provider.id = :userId)
                    order by coalesce(c.lastMessageAt, c.createdAt) desc
                    """,
            countQuery = """
                    select count(c)
                    from ChatConversation c
                    where c.jobMatch.connectionSucceededAt is not null
                      and c.jobMatch.chatUnlockedAt is not null
                      and (c.jobMatch.consumer.id = :userId or c.jobMatch.provider.id = :userId)
                    """
    )
    Page<ChatConversation> findAllForParticipant(@Param("userId") UUID userId, Pageable pageable);
}
