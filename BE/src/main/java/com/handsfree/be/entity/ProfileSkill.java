package com.handsfree.be.entity;

import com.handsfree.be.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="profile_skills", uniqueConstraints=@UniqueConstraint(name="uk_profile_skill_key", columnNames="normalized_name"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ProfileSkill extends BaseEntity {
    @Id @GeneratedValue(strategy=GenerationType.UUID) @Column(name="skill_id") private UUID id;
    @Column(nullable=false, length=40) private String name;
    @Column(name="normalized_name", nullable=false, length=40) private String normalizedName;
    @Column(nullable=false, length=12) private String status;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="submitted_by") private User submittedBy;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="reviewed_by") private User reviewedBy;
    @Column(name="reviewed_at") private Instant reviewedAt;
    @Column(name="rejection_reason", length=300) private String rejectionReason;
}
