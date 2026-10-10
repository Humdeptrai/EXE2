package com.handsfree.be.service;
import org.springframework.web.multipart.MultipartFile;
import java.time.Instant;
import java.util.UUID;
public interface IdentityProgressService {
    record Progress(boolean scanPassed, boolean selfiePassed, boolean frontPassed, boolean backPassed,
                    String frontReason, String backReason, String status, String documentNumber,
                    String selfieUrl, String frontUrl, String backUrl, Instant updatedAt, long version) {}
    Progress get(UUID user);
    void saveScan(UUID user,String checkpoint);
    Progress selfie(UUID user,MultipartFile image);
    Progress document(UUID user,String side,MultipartFile image);
    FaceComparisonService.Completion finish(UUID user);
    byte[] image(UUID user,String side);
}
