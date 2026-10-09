package com.handsfree.be.service;
import com.handsfree.be.entity.IdentityVerification;
import com.handsfree.be.repository.IdentityRepository;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import java.time.Instant;

public interface IdentityService {
    record Status(UUID userId, String status, String reason, Instant submittedAt, Instant verifiedAt, boolean enabled) {}
    record Dossier(Status verification, String fullName, String documentData, Double similarity, Boolean live) {}
    record Eligibility(boolean eligible, boolean profileComplete, boolean identityVerified,
                       String identityStatus, java.util.List<String> missingRequirements) {}
    Eligibility eligibility(UUID user);
    Status status(UUID user);
    Status summary(IdentityVerification identity);
    Status summary(IdentityRepository.State identity);
    void requireVerified(UUID user);
    Status submit(UUID user, MultipartFile front, MultipartFile back, MultipartFile face, MultipartFile video, boolean consent);
    Dossier dossier(UUID actor, UUID user);
    byte[] adminImage(UUID actor, UUID user, String kind);
    byte[] verifiedFace(UUID user);
    com.handsfree.be.dto.response.PageResponse<Status> list(UUID actor, int page);
    byte[] counterpartFace(UUID actor, UUID match);
}
