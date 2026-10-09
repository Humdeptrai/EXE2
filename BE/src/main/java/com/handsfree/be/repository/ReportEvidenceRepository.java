package com.handsfree.be.repository;
import com.handsfree.be.entity.ReportEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface ReportEvidenceRepository extends JpaRepository<ReportEvidence, UUID> {
    List<ReportEvidence> findByReport_IdOrderByCreatedAtAsc(UUID reportId);
    Optional<ReportEvidence> findByIdAndReport_Id(UUID id, UUID reportId);
}
