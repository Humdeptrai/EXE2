package com.handsfree.be.entity;

import jakarta.persistence.*;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_audit")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID actorId;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(nullable = false, length = 2000)
    private String detail;

    @Column(nullable = false)
    private Instant occurredAt;
}
