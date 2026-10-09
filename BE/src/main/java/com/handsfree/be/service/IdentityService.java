package com.handsfree.be.service;
import com.handsfree.be.entity.IdentityVerification;
import com.handsfree.be.repository.IdentityRepository;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import java.time.Instant;

public interface IdentityService {
    record Status(UUID userId, String status, String reason, Instant submittedAt, Instant verifiedAt, boolean enabled) {}
    record Dossier(Status verification, String fullName, String documentData, Double similarity, Boolean live,
                   String documentNumber, boolean pending, long version, boolean selfiePresent, boolean activeVerified) {}
    record MyIdentity(Status verification, String documentNumber, boolean documentConfirmed,
                      boolean selfieUploaded, boolean selfieVerified, String selfieUrl, boolean pendingReplacement) {}
    record DocumentCorrection(String documentNumber, String reason, boolean pending, Long version) {}
    record ScanSubmission(byte[] front, byte[] back, byte[] face, byte[] selfie, String fullName,
                          String documentNumber, String evidence, double similarity, boolean approved, String reason) {}
    void storeScan(UUID user, ScanSubmission data);
    MyIdentity mine(UUID user);
    byte[] ownSelfie(UUID user);
    Dossier correctDocument(UUID actor, UUID user, DocumentCorrection request);
    record Eligibility(boolean eligible, boolean profileComplete, boolean identityVerified,
                       String identityStatus, java.util.List<String> missingRequirements, boolean selfieVerified, boolean documentConfirmed) {}
    Eligibility eligibility(UUID user);
    record Review(boolean approved, Instant submittedAt, String fullName, String reason, Long version) {}
    Status review(UUID actor, UUID user, Review request);
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
