package com.handsfree.be.repository;

import com.handsfree.be.entity.ConnectionPayment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConnectionPaymentRepository extends JpaRepository<ConnectionPayment, UUID> {
    @EntityGraph(attributePaths = {
            "jobMatch",
            "jobMatch.jobPost",
            "jobMatch.jobPost.category",
            "jobMatch.consumer",
            "jobMatch.provider"
    })
    Optional<ConnectionPayment> findByJobMatch_Id(UUID matchId);
}
