package com.handsfree.be.service;

import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

/** Public contract; controllers depend on this interface, never the implementation. */
public interface FaceComparisonService {
    record Scan(UUID sessionId, String step, int completed, int total, int progress,
                boolean complete, String message, int expiresIn) {}
    record Completion(String status, String decision, double cosineScore, double threshold,
                      boolean motionPassed, boolean antiSpoofPassed, boolean documentReadable,
                      boolean identityVerified, String message) {}
    record SelfieCapture(boolean accepted, String message, int expiresIn) {}
    SelfieCapture selfie(UUID user, UUID session, MultipartFile image);
    Scan start(UUID user, boolean consent);
    Scan frame(UUID user, UUID session, MultipartFile face);
    Completion finish(UUID user, UUID session, MultipartFile front, MultipartFile back);
    void cancel(UUID user, UUID session);
}
