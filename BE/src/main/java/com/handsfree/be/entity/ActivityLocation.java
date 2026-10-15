package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity @Table(name="activity_locations") @Getter @Setter @NoArgsConstructor
public class ActivityLocation {
    @Id private UUID userId;
    @Column(nullable=false,length=120) private String area;
    private Double latitude;
    private Double longitude;
    private Integer radiusKm;
}
