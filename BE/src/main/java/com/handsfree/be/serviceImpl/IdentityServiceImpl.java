package com.handsfree.be.serviceImpl;

import com.handsfree.be.entity.IdentityVerification;
import com.handsfree.be.repository.*;
import com.handsfree.be.properties.IdentityProperties;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class IdentityServiceImpl implements com.handsfree.be.service.IdentityService {
    private final IdentityRepository identities;
    private final UserRepository users;
    private final AccountAccess access;
    private final IdentityProperties properties;
    private final IdentityCrypto crypto;
    private final FptIdentityClient provider;
    private final TransactionTemplate transactions;
    private final JobMatchRepository matches;
    private final ContactAccess contacts;
    private final ManagementService management;


    public Status status(UUID user) {
        access.active(user);
        return identities.findStateByUserId(user).map(this::summary)
                .orElse(new Status(user, "NOT_SUBMITTED", null, null, null, properties.isEnabled()));
    }
    public Status summary(IdentityVerification i) {
        return new Status(i.getUserId(), i.getStatus(), i.getReason(), i.getSubmittedAt(), i.getVerifiedAt(), properties.isEnabled());
    }
    public Status summary(IdentityRepository.State i) {
        return new Status(i.getUserId(), i.getStatus(), i.getReason(), i.getSubmittedAt(), i.getVerifiedAt(), properties.isEnabled());
    }
    public void requireVerified(UUID user) {
        access.active(user);
        if (!identities.existsByUserIdAndStatus(user, "VERIFIED"))
            throw new AppException(ErrorCode.IDENTITY_REQUIRED);
    }
    public Status submit(UUID user, MultipartFile front, MultipartFile back, MultipartFile face, MultipartFile video, boolean consent) {
        access.active(user);
        if (!consent) throw new AppException(ErrorCode.VALIDATION_FAILED);
        if (!properties.isEnabled() || properties.getApiKey().isBlank()) throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED);
        crypto.validateKey();
        byte[] f = jpeg(front), b = jpeg(back), s = jpeg(face), v = video(video);
        Instant attempt = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        Status existing = transactions.execute(tx -> {
            users.lockById(user).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            var i = identities.findById(user).orElseGet(() -> { var n = new IdentityVerification(); n.setUserId(user); return n; });
            if ("VERIFIED".equals(i.getStatus())) return summary(i);
            if (i.getSubmittedAt() != null && i.getSubmittedAt().isAfter(attempt.minusSeconds("PROCESSING".equals(i.getStatus()) ? 300 : 60)))
                throw new AppException(ErrorCode.IDENTITY_BUSY);
            i.setStatus("PROCESSING"); i.setSubmittedAt(attempt); i.setConsentAt(attempt); i.setReason("Đang đối chiếu hồ sơ");
            i.setFullName(null); i.setDocumentData(null); i.setSimilarity(null); i.setLive(null); i.setVerifiedAt(null);
            i.setFrontImage(crypto.encrypt(f)); i.setBackImage(crypto.encrypt(b)); i.setFaceImage(crypto.encrypt(s));
            identities.saveAndFlush(i); return null;
        });
        if (existing != null) return existing;
        FptIdentityClient.Result result;
        try { result = provider.verify(f, b, s, v); }
        catch (Exception e) {
            transactions.executeWithoutResult(tx -> identities.lockById(user).ifPresent(i -> {
                if (attempt.equals(i.getSubmittedAt())) { i.setStatus("ERROR"); i.setReason("Dịch vụ xác thực chưa sẵn sàng. Vui lòng gửi lại sau."); }
            }));
            throw e;
        }
        return transactions.execute(tx -> {
            var i = identities.lockById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND));
            if (!attempt.equals(i.getSubmittedAt())) throw new AppException(ErrorCode.IDENTITY_BUSY);
            i.setStatus(result.verified() ? "VERIFIED" : "REJECTED"); i.setReason(result.reason());
            i.setVerifiedAt(result.verified() ? Instant.now() : null);
            i.setFullName(crypto.encrypt(result.name())); i.setDocumentData(crypto.encrypt(result.document()));
            i.setSimilarity(result.similarity()); i.setLive(result.live());
            return summary(i);
        });
    }
    public Dossier dossier(UUID actor, UUID user) {
        access.operator(actor, true);
        var i = get(user);
        management.log(actor, "IDENTITY_VIEW", user.toString());
        return new Dossier(summary(i), crypto.text(i.getFullName()), crypto.text(i.getDocumentData()), i.getSimilarity(), i.getLive());
    }
    public byte[] adminImage(UUID actor, UUID user, String kind) {
        access.operator(actor, true);
        var i = get(user);
        byte[] data = switch(kind) { case "front" -> i.getFrontImage(); case "back" -> i.getBackImage(); case "face" -> i.getFaceImage(); default -> throw new AppException(ErrorCode.FORBIDDEN); };
        if (data == null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        management.log(actor, "IDENTITY_IMAGE_VIEW", user + " " + kind);
        return crypto.decrypt(data);
    }
    public byte[] verifiedFace(UUID user) {
        var i = get(user);
        if (!"VERIFIED".equals(i.getStatus()) || i.getFaceImage() == null) throw new AppException(ErrorCode.IDENTITY_NOT_FOUND);
        return crypto.decrypt(i.getFaceImage());
    }
    @Override public com.handsfree.be.dto.response.PageResponse<Status> list(UUID actor, int page) {
        access.operator(actor, false);
        return com.handsfree.be.dto.response.PageResponse.from(identities.findAllProjectedBy(
            org.springframework.data.domain.PageRequest.of(Math.max(page, 0), 20,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "submittedAt"))).map(this::summary));
    }
    @Override @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public byte[] counterpartFace(UUID actor, UUID match) {
        access.active(actor);
        var m = matches.findById(match).orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        if (!m.getConsumer().getId().equals(actor) && !m.getProvider().getId().equals(actor)) throw new AppException(ErrorCode.MATCH_NOT_FOUND);
        if (!contacts.unlocked(m)) throw new AppException(ErrorCode.CHAT_NOT_UNLOCKED);
        UUID other = m.getConsumer().getId().equals(actor) ? m.getProvider().getId() : m.getConsumer().getId();
        return verifiedFace(other);
    }
    private IdentityVerification get(UUID user) { return identities.findById(user).orElseThrow(() -> new AppException(ErrorCode.IDENTITY_NOT_FOUND)); }
    private byte[] jpeg(MultipartFile file) {
        try {
            if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024 || !"image/jpeg".equals(file.getContentType()))
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            byte[] raw = file.getBytes();
            if (raw.length < 3 || (raw[0] & 255) != 255 || (raw[1] & 255) != 216) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            java.awt.image.BufferedImage image;
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(raw))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 640 || height < 480 || width > 5000 || height > 5000)
                        throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
                    image = reader.read(0);
                } finally { reader.dispose(); }
            }
            if (image == null) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            // Re-encode: discard EXIF (including GPS), keep a safe JPEG to serve privately.
            var output = new ByteArrayOutputStream(); ImageIO.write(image, "jpg", output);
            if (output.size() > 5 * 1024 * 1024) throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            return output.toByteArray();
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA); }
    }
    private byte[] video(MultipartFile file) {
        try {
            if (file == null || file.isEmpty() || file.getSize() > 10 * 1024 * 1024 || !"video/mp4".equals(file.getContentType()))
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            byte[] raw = file.getBytes();
            if (raw.length < 12 || raw[4] != 'f' || raw[5] != 't' || raw[6] != 'y' || raw[7] != 'p')
                throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA);
            return raw;
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_INVALID_MEDIA); }
    }
}
