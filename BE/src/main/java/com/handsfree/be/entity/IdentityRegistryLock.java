package com.handsfree.be.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="identity_registry_lock") @Getter @Setter @NoArgsConstructor
public class IdentityRegistryLock { @Id private Integer id; }
