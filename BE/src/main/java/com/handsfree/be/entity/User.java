package com.handsfree.be.entity;

import com.handsfree.be.base.BaseEntity;
import com.handsfree.be.constant.AuthProvider;
import com.handsfree.be.constant.UserMode;
import com.handsfree.be.constant.UserRole;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_email", columnNames = "email"),
        @UniqueConstraint(name = "uk_users_phone", columnNames = "phone"),
        @UniqueConstraint(name = "uk_users_google_subject", columnNames = "google_subject")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "google_subject", length = 100)
    private String googleSubject;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "avatar_storage_key", length = 255)
    private String avatarStorageKey;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "location", length = 120)
    private String location;

    @Builder.Default
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_profile_tags", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "tag", nullable = false, length = 40)
    private Set<String> profileTags = new LinkedHashSet<>();

    @Builder.Default
    @Column(name = "profile_completed", nullable = false, columnDefinition = "boolean default false")
    private boolean profileCompleted = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 20)
    private AuthProvider authProvider;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_mode", nullable = false, length = 20)
    private UserMode currentMode;

    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;
}
