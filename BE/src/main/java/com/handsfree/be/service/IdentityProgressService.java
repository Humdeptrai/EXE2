package com.handsfree.be.service;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;
import java.util.UUID;
public interface IdentityProgressService {
    record Progress(boolean scanPassed, boolean selfiePassed, boolean frontPassed, boolean backPassed,
                    String frontReason, String backReason, String status, String documentNumber,
                    String selfieUrl, String frontUrl, String backUrl, Instant updatedAt, long version) {}
    record Profile(IdentityService.Eligibility eligibility, IdentityService.MyIdentity personal, Progress progress) {}
    Profile profile(UUID user);
    Progress get(UUID user);
    void saveScan(UUID user,String checkpoint);
    Progress selfie(UUID user,MultipartFile image);
    Progress replaceSelfie(UUID user,MultipartFile image);
    Progress document(UUID user,String side,MultipartFile image);
    record ManualReview(String fullName, String documentNumber, String note) {}
    IdentityService.Appeal requestReview(UUID user, ManualReview request);
    FaceComparisonService.Completion finish(UUID user);
    byte[] image(UUID user,String side);
}
