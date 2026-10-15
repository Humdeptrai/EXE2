package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
@Entity @Table(name="saved_addresses") @Getter @Setter @NoArgsConstructor
public class SavedAddress {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private UUID ownerId;
    @Column(nullable=false,length=40) private String label;
    @Column(nullable=false,length=255) private String address;
    @Column(nullable=false,length=120) private String area;
    private Double latitude;
    private Double longitude;
    @Column(nullable=false) private boolean defaultAddress;
}
