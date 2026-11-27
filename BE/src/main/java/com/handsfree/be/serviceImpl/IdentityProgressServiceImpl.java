package com.handsfree.be.serviceImpl;
import static com.handsfree.be.diagnostics.PerformanceTrace.measure;
import com.handsfree.be.entity.IdentityProgress;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import java.util.UUID;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service @RequiredArgsConstructor
public class IdentityProgressServiceImpl implements IdentityProgressService {
    private final com.handsfree.be.service.IdentityRegistryService registry;
    private final IdentityProgressRepository repository;
    private final UserRepository users;
    private final IdentityRepository identities;
    private final IdentitySubmissionRepository submissions;
    private final AccountAccess access;
    private final IdentityCrypto crypto;
    private final FaceWorkerClient worker;
    private final ObjectMapper json;
    private final IdentityService identity;
    private final PlatformSettingsService settings;
    private final IdentityFeedbackService feedback;
    private void user(UUID user) { if(access.active(user).getRole()!=com.handsfree.be.constant.UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN); }
    private IdentityProgress locked(UUID id) {
        user(id);users.lockById(id).orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
        identity.requireNoOpenAppeal(id);
        return repository.lockById(id).orElseGet(()->{ var p=new IdentityProgress();p.setUserId(id);p.setOutcomeReason(null);p.setStatus("DRAFT");return p; });
    }
    private void save(IdentityProgress p) { p.setUpdatedAt(Instant.now());repository.saveAndFlush(p); }
    private Progress summary(IdentityProgress p) {
        if(p==null) return new Progress(false,false,false,false,null,null,"DRAFT",null,null,null,null,null,0,null,false);
        return new Progress(p.getCheckpoint()!=null && !p.isFacePhotoUploaded(),p.isSelfiePassed(),p.isFrontPassed(),p.isBackPassed(),
            p.getFrontReason(),p.getBackReason(),p.getStatus(),crypto.text(p.getDocumentNumber()),
            p.getSelfieImage()==null?null:"/identity/progress/images/selfie",
            p.getFrontImage()==null?null:"/identity/progress/images/front",
            p.getBackImage()==null?null:"/identity/progress/images/back",p.getUpdatedAt(),p.getVersion(),
            p.isFrontPassed() ? checkpointName(p.getCheckpoint()) : null,p.isFacePhotoUploaded());
    }
    private String normalizeName(String name) {
        if(name==null || name.isBlank()) return null;
        String value=java.text.Normalizer.normalize(name,java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").replace('đ','d').replace('Đ','D')
            .toUpperCase(java.util.Locale.ROOT).trim().replaceAll("\\s+", " ");
        return value.matches("[A-Z][A-Z .'-]{0,98}[A-Z]") ? value : null;
    }
    private String checkpointName(byte[] checkpoint) {
        if(checkpoint==null) return null;
        var front=payload(crypto.text(checkpoint)).path("documents").path("front");
        return front.path("passed").asBoolean(false) ? normalizeName(front.path("fullName").asString("")) : null;
    }
    private AppException invalidResponse(String operation,String reason) { return new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
    private JsonNode payload(String token) {
        try { return json.readTree(new String(java.util.Base64.getDecoder().decode(token.split("\\.",2)[0]),StandardCharsets.UTF_8)); }
        catch(Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
    }
    private void checkpoint(IdentityProgress p,JsonNode response) {
        if(response.path("policyVersion").asInt(0)!=4) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        String token=response.path("checkpoint").asString("");
        if(token.length()<1000 || token.length()>20*1024*1024) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        boolean photo="PHOTO_UPLOAD".equals(payload(token).path("source").asString(""));
        if(photo!=p.isFacePhotoUploaded()) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        p.setCheckpoint(crypto.encrypt(token));
    }
    private void photoEnabled(IdentityProgress p) {
        if(p.isFacePhotoUploaded() && !settings.get().isFacePhotoUploadEnabled())
            throw new AppException(ErrorCode.IDENTITY_PHOTO_UPLOAD_DISABLED);
    }
    @Override @Transactional public Options options(UUID user) {
        user(user);
        return new Options(settings.get().isFacePhotoUploadEnabled(),true);
    }
    @Override @Transactional public Progress uploadFace(UUID user,MultipartFile face,boolean consent) {
        var p=locked(user);
        if(!settings.get().isFacePhotoUploadEnabled()) throw new AppException(ErrorCode.IDENTITY_PHOTO_UPLOAD_DISABLED);
        if(!consent) throw new AppException(ErrorCode.VALIDATION_FAILED);
        byte[] raw=jpeg(face);
        JsonNode response;
        try { response=worker.send("POST","/photo-reference",new String[]{"face"},new byte[][]{raw}); }
        catch(AppException error) {
            if(error.getErrorCode()==ErrorCode.IDENTITY_SCAN_FAILED) throw new AppException(ErrorCode.IDENTITY_FACE_PHOTO_INVALID);
            throw error;
        }
        var data=payload(response.path("checkpoint").asString(""));
        if(!response.path("accepted").asBoolean(false) || data.path("policyVersion").asInt(0)!=4 || !"PHOTO_UPLOAD".equals(data.path("source").asString(""))
                || data.path("total").asInt(-1)!=0 || !data.path("pad").isArray() || data.path("pad").size()!=0)
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        var reference=data.path("reference");
        if(!reference.isArray() || reference.size()!=1 || !reference.get(0).isArray() || reference.get(0).size()!=128)
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        for(var value:reference.get(0)) if(!Double.isFinite(value.asDouble(Double.NaN))) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        byte[] portrait;
        try { portrait=java.util.Base64.getDecoder().decode(data.path("portrait").asString("")); }
        catch(Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
        if(portrait.length<1000 || portrait.length>5*1024*1024) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        p.setFacePhotoUploaded(true);checkpoint(p,response);
        p.setFaceImage(crypto.encrypt(portrait));p.setSelfiePassed(false);p.setSelfieImage(null);
        p.setFrontPassed(false);p.setBackPassed(false);p.setFrontImage(null);p.setBackImage(null);
        p.setDocumentNumber(null);p.setFrontReason(null);p.setBackReason(null);p.setOutcomeReason(null);p.setStatus("DRAFT");
        save(p);return summary(p);
    }
    private byte[] jpeg(MultipartFile file) {
        try {
            if (file == null || file.isEmpty() || file.getSize() > 5 * 1024 * 1024
                    || !"image/jpeg".equals(file.getContentType())) throw new IllegalArgumentException();
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new IllegalArgumentException();
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    if (!"JPEG".equalsIgnoreCase(reader.getFormatName())) throw new IllegalArgumentException();
                    int w = reader.getWidth(0), h = reader.getHeight(0);
                    if (w < 320 || h < 240 || w > 5000 || h > 5000 || (long) w * h > 16000000)
                        throw new IllegalArgumentException();
                    var out = new ByteArrayOutputStream();
                    // Decode fully and strip metadata, but preserve small OCR text at high quality.
                    var decoded = reader.read(0);
                    var writers = ImageIO.getImageWritersByFormatName("jpeg");
                    var writer = writers.next();
                    try (var output = ImageIO.createImageOutputStream(out)) {
                        writer.setOutput(output);
                        var parameters = writer.getDefaultWriteParam();
                        parameters.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
                        parameters.setCompressionQuality(.95f);
                        writer.write(null, new javax.imageio.IIOImage(decoded, null, null), parameters);
                    } finally { writer.dispose(); }
                    if (out.size() > 5 * 1024 * 1024) throw new IllegalArgumentException();
                    return out.toByteArray();
                } finally { reader.dispose(); }
            }
        } catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_SCAN_MEDIA); }
    }
    @Override @Transactional(readOnly=true) public Profile profile(UUID user) {
        user(user);
        var personal = identity.mine(user);
        var p=repository.findSnapshot(user).orElse(null);
        var outcome=p!=null && p.getOutcomeReason()!=null
            ? new Outcome(p.getStatus(),p.getOutcomeReason())
            : new Outcome(personal.verification().status(),personal.verification().reason());
        return new Profile(identity.eligibility(user), personal, readProgress(user, personal),outcome);
    }
    @Override @Transactional(readOnly=true) public Progress get(UUID user) {
        measure("progress.account", () -> { user(user); return null; });
        return readProgress(user, measure("progress.identity.read", () -> identity.mine(user)));
    }
    private Progress readProgress(UUID user, IdentityService.MyIdentity active) {
        var p = measure("progress.row.read", () -> repository.findSnapshot(user).orElse(null));
        boolean activeComplete = "VERIFIED".equals(active.verification().status()) && active.selfieVerified() && active.documentConfirmed();
        boolean newerApproval = p != null && p.getUpdatedAt() != null && active.verification().verifiedAt() != null
                && active.verification().verifiedAt().isAfter(p.getUpdatedAt());
        if (activeComplete && (p == null || "VERIFIED".equals(p.getStatus()) || newerApproval))
            return new Progress(p == null || !p.getFacePhotoUploaded(), true, true, true, null, null, "VERIFIED", active.documentNumber(), active.selfieUrl(),
                    p == null || !p.getHasFront() ? null : "/identity/progress/images/front",
                    p == null || !p.getHasBack() ? null : "/identity/progress/images/back",
                    active.verification().verifiedAt(), p == null ? 0 : p.getVersion(),normalizeName(active.documentFullName()),p != null && p.getFacePhotoUploaded());
        if (p == null) return summary(null);
        return new Progress(p.getHasCheckpoint() && !p.getFacePhotoUploaded(), p.getSelfiePassed(), p.getFrontPassed(), p.getBackPassed(),
                p.getFrontReason(), p.getBackReason(), p.getStatus(), crypto.text(p.getDocumentNumber()),
                p.getHasSelfie() ? "/identity/progress/images/selfie" : null,
                p.getHasFront() ? "/identity/progress/images/front" : null,
                p.getHasBack() ? "/identity/progress/images/back" : null, p.getUpdatedAt(), p.getVersion(),
                p.getFrontPassed() ? checkpointName(repository.findCheckpoint(user).map(IdentityProgressRepository.CheckpointData::getCheckpoint).orElse(null)) : null,p.getFacePhotoUploaded());
    }
    @Override @Transactional public void saveScan(UUID user,String token) {
        var p=locked(user);var data=payload(token);
        if(data.path("policyVersion").asInt(0)!=4 || data.path("total").asInt(0)!=6 || token.length()>20*1024*1024)
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        if("PHOTO_UPLOAD".equals(data.path("source").asString(""))) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        // Re-delivery of the last frame must not erase already saved subsequent steps.
        if(p.getCheckpoint()!=null && payload(crypto.text(p.getCheckpoint())).path("nonce").asString("").equals(data.path("nonce").asString(""))) return;
        p.setCheckpoint(crypto.encrypt(token));p.setFaceImage(crypto.encrypt(java.util.Base64.getDecoder().decode(data.path("portrait").asString(""))));
        p.setFacePhotoUploaded(false);
        p.setSelfiePassed(false);p.setSelfieImage(null);p.setFrontPassed(false);p.setBackPassed(false);
        p.setFrontImage(null);p.setBackImage(null);p.setDocumentNumber(null);p.setFrontReason(null);p.setBackReason(null);p.setOutcomeReason(null);p.setStatus("DRAFT");save(p);
    }
    @Override @Transactional public Progress selfie(UUID user,MultipartFile image) {
        var p=locked(user);photoEnabled(p);if(p.getCheckpoint()==null) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        byte[] raw=jpeg(image);
        JsonNode response;
        try { response=worker.send("POST","/checkpoints/selfie",new String[]{"checkpoint","selfie"},new byte[][]{crypto.decrypt(p.getCheckpoint()),raw}); }
        catch(AppException e) {
            p.setSelfiePassed(false);blocked(user,p,"ERROR","Dịch vụ kiểm tra selfie chưa sẵn sàng. Vui lòng thử lại sau.");return summary(p);
        }
        if(!response.path("accepted").asBoolean(false)) {
            p.setSelfiePassed(false);blocked(user,p,"REVIEW_REQUIRED","Selfie chưa đạt đối chiếu khuôn mặt trực tiếp. Vui lòng nhìn thẳng, đủ sáng và chụp lại.");return summary(p);
        }
        checkpoint(p,response);p.setSelfieImage(crypto.encrypt(raw));p.setSelfiePassed(true);
        p.setFrontPassed(false);p.setBackPassed(false);p.setFrontReason(null);p.setBackReason(null);p.setOutcomeReason(null);p.setStatus("DRAFT");save(p);return summary(p);
    }
    @Override @Transactional public Progress replaceSelfie(UUID user,MultipartFile image) {
        var p=locked(user);
        var active=identities.lockById(user).orElseThrow(()->new AppException(ErrorCode.IDENTITY_REQUIRED));
        if(!"VERIFIED".equals(active.getStatus()) || active.getSelfieVerifiedAt()==null
                || submissions.existsById(user) || active.getFaceImage()==null || p.getCheckpoint()==null || p.getFaceImage()==null
                || !java.util.Arrays.equals(crypto.decrypt(p.getFaceImage()),crypto.decrypt(active.getFaceImage())))
            throw new AppException(ErrorCode.IDENTITY_REVIEW_CONFLICT);
        byte[] raw=jpeg(image);
        var response=worker.send("POST","/checkpoints/selfie",new String[]{"checkpoint","selfie"},new byte[][]{crypto.decrypt(p.getCheckpoint()),raw});
        if(response.path("policyVersion").asInt(0)!=4 || !response.path("accepted").asBoolean(false))
            throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
        // Keep the approved scan, document evidence and original signed checkpoint unchanged.
        active.setSelfieImage(crypto.encrypt(raw));active.setSelfieVerifiedAt(Instant.now());
        identities.saveAndFlush(active);
        p.setSelfieImage(crypto.encrypt(raw));p.setSelfiePassed(true);p.setStatus("VERIFIED");save(p);
        return get(user);
    }
    @Override @Transactional public Progress document(UUID user,String side,MultipartFile image) {
        if(!java.util.Set.of("front","back").contains(side)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        var p=locked(user);photoEnabled(p);if(!p.isSelfiePassed()) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        byte[] raw=jpeg(image);
        // Retain valid image uploads even when the automated worker cannot read
        // them or is unavailable, so the user can request manual review.
        if (side.equals("front")) { p.setFrontImage(crypto.encrypt(raw)); p.setFrontPassed(false); p.setDocumentNumber(null); }
        else { p.setBackImage(crypto.encrypt(raw)); p.setBackPassed(false); }
        JsonNode response;
        try {
            response=worker.send("POST","/checkpoints/"+side,new String[]{"checkpoint",side},new byte[][]{crypto.decrypt(p.getCheckpoint()),raw});
            checkpoint(p,response);
        } catch (AppException error) {
            String message="Ảnh đã được lưu nhưng chưa kiểm tra tự động được. Bạn có thể thử lại hoặc gửi ADMIN xét duyệt khi đủ hồ sơ.";
            if(side.equals("front")) p.setFrontReason(message); else p.setBackReason(message);
            p.setOutcomeReason(message);p.setStatus("ERROR");save(p);feedback.send(user,"ERROR",message,false);return summary(p);
        }
        boolean passed=response.path("passed").asBoolean(false);String reason=response.path("reasonCode").asString("");
        if(side.equals("front")) {
            p.setFrontImage(crypto.encrypt(raw));p.setFrontPassed(passed);p.setFrontReason(passed?null:documentRetry(reason));
            var info=payload(crypto.text(p.getCheckpoint())).path("documents").path("front");
            String number=info.path("documentNumber").asString("");p.setDocumentNumber(passed && number.matches("[0-9]{12}")?crypto.encrypt(number):null);
        } else { p.setBackImage(crypto.encrypt(raw));p.setBackPassed(passed);p.setBackReason(passed?null:documentRetry(reason)); }
        p.setOutcomeReason(passed?null:documentRetry(reason));p.setStatus(passed?"DRAFT":"REVIEW_REQUIRED");
        save(p);if(!passed)feedback.send(user,"REVIEW_REQUIRED",p.getOutcomeReason(),false);return summary(p);
    }
    @Override @Transactional(readOnly=true) public byte[] image(UUID user, String side) {
        user(user);
        if (!java.util.Set.of("face", "selfie", "front", "back").contains(side)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        byte[] data = measure("progress.image.read", () -> repository.findImageData(user, side))
                .map(com.handsfree.be.repository.IdentityImageData::getData)
                .orElseThrow(() -> new AppException(ErrorCode.IDENTITY_REQUIRED));
        return measure("progress.image.decrypt", () -> crypto.decrypt(data));
    }
    private String documentRetry(String reason) {
        return switch(reason) {
            case "FRONT_QUALITY_CARD_FRAME", "BACK_QUALITY_CARD_FRAME" -> "Chưa nhận diện được đường viền CCCD trong ảnh. Chọn ảnh có đủ toàn bộ thẻ, viền tách khỏi nền và một khoảng nền quanh thẻ.";
            case "FRONT_QUALITY_TOO_SMALL", "BACK_QUALITY_TOO_SMALL" -> "CCCD trong ảnh có độ phân giải quá thấp. Chọn ảnh gốc hoặc chụp gần hơn, giữ toàn bộ thẻ trong ảnh.";
            case "FRONT_QUALITY_BLUR", "BACK_QUALITY_BLUR" -> "Chi tiết trên CCCD chưa đủ nét để đọc. Chọn ảnh gốc rõ chữ hoặc lấy nét lại vào thẻ.";
            case "FRONT_QUALITY_LIGHTING", "BACK_QUALITY_LIGHTING" -> "Ánh sáng trên CCCD chưa phù hợp. Tránh bóng đổ, vùng tối hoặc phản sáng che chữ.";
            case "FRONT_OCR" -> "Chưa đọc rõ mặt trước CCCD. Chụp lại mặt trước, giữ đủ bốn góc và chữ rõ nét.";
            case "DOCUMENT_NUMBER_MISMATCH" -> "Thông tin hai mặt CCCD chưa khớp. Kiểm tra và chụp lại mặt sau đúng giấy tờ.";
            case "BACK_OCR" -> "Chưa đọc rõ mặt sau CCCD. Chỉ cần chụp lại mặt sau; các bước đã đạt được giữ lại.";
            case "FRONT_FACE" -> "Chưa nhận rõ khuôn mặt trên CCCD. Chụp lại mặt trước.";
            case "BACK_QUALITY" -> "Mặt sau chưa rõ hoặc thiếu góc. Chụp lại mặt sau.";
            default -> "Mặt trước chưa rõ hoặc thiếu góc. Chụp lại mặt trước.";
        };
    }
    @Override @Transactional public IdentityService.Appeal requestReview(UUID user, ManualReview request) {
        registry.lock();
        user(user);
        var existing=identity.latestAppeal(user);
        if(existing!=null && java.util.Set.of("REQUESTED","PROCESSING").contains(existing.status())) return existing;
        var p=locked(user);
        photoEnabled(p);
        String name=request==null || request.fullName()==null ? "" : request.fullName().trim();
        String number=request==null || request.documentNumber()==null ? "" : request.documentNumber().trim();
        String note=request==null || request.note()==null ? "" : request.note().trim();
        if(name.length()<2 || name.length()>100 || number.isEmpty() || number.length()>100 || note.length()>500)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        if(p.getCheckpoint()==null || p.getFaceImage()==null || !p.isSelfiePassed()
                || p.getSelfieImage()==null || p.getFrontImage()==null || p.getBackImage()==null)
            throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        var checkpoint=payload(crypto.text(p.getCheckpoint()));
        var evidence=json.createObjectNode();
        evidence.put("verificationSource",p.isFacePhotoUploaded()?"PHOTO_UPLOAD":"USER_REQUESTED_MANUAL_REVIEW");
        if(p.isFacePhotoUploaded()) { evidence.put("motionPassed",false);evidence.put("faceReferenceLivenessVerified",false); }
        evidence.put("declaredFullName",name);evidence.put("declaredDocumentNumber",number);
        evidence.put("frontPassed",p.isFrontPassed());evidence.put("backPassed",p.isBackPassed());
        evidence.put("frontReason",p.getFrontReason());evidence.put("backReason",p.getBackReason());
        evidence.set("documents",checkpoint.path("documents").deepCopy());
        evidence.put("faceModel","sface-2021dec-128");
        evidence.set("faceEmbedding",checkpoint.path("reference").deepCopy());
        double score=checkpoint.path("documents").path("front").path("scanScore").asDouble(0);
        var submission=new IdentityService.ScanSubmission(crypto.decrypt(p.getFrontImage()),crypto.decrypt(p.getBackImage()),
                crypto.decrypt(p.getFaceImage()),crypto.decrypt(p.getSelfieImage()),name,number,json.writeValueAsString(evidence),
                score,false,p.isFacePhotoUploaded()?"Hồ sơ dùng ảnh khuôn mặt tải lên, không thực hiện quét động tác; cần ADMIN xét duyệt.":"Người dùng yêu cầu ADMIN xét duyệt hồ sơ đã lưu.",!p.isFacePhotoUploaded());
        var appeal=identity.submitManualReview(user,submission,note);
        p.setStatus("REVIEW_REQUIRED");p.setOutcomeReason(submission.reason());save(p);return appeal;
    }
    @Override @Transactional public FaceComparisonService.Completion finish(UUID user) {
        registry.lock();
        var p=locked(user);
        if(p.isFacePhotoUploaded()) return blocked(user,p,"REVIEW_REQUIRED","Hồ sơ dùng ảnh khuôn mặt tải lên nên cần quản trị viên xét duyệt. Vui lòng gửi yêu cầu kiểm tra danh tính.");
        if(!p.isSelfiePassed() || !p.isFrontPassed() || !p.isBackPassed()) return blocked(user,p,"REVIEW_REQUIRED","Chưa đủ các bước selfie và CCCD hai mặt đã đạt. Vui lòng hoàn thiện bước còn thiếu hoặc gửi yêu cầu kiểm tra danh tính.");
        byte[] f=crypto.decrypt(p.getFrontImage()),b=crypto.decrypt(p.getBackImage());
        if("VERIFIED".equals(p.getStatus()) && "VERIFIED".equals(identity.status(user).status()))
            return new FaceComparisonService.Completion("VERIFIED","MATCH",0,.32,true,true,true,true,"Hồ sơ đã được xác minh và lưu.");
        JsonNode response;
        try { response=worker.send("POST","/checkpoints/finish",new String[]{"checkpoint","front","back"},new byte[][]{crypto.decrypt(p.getCheckpoint()),f,b}); }
        catch(AppException e) {
            var message="Dịch vụ đối chiếu chưa sẵn sàng. Các bước đã lưu được giữ lại; vui lòng thử lại sau hoặc gửi yêu cầu kiểm tra danh tính.";
            p.setStatus("ERROR");p.setOutcomeReason(message);save(p);feedback.send(user,"ERROR",message,false);
            return new FaceComparisonService.Completion("ERROR","NO_MATCH",0,.32,false,false,false,false,message);
        }
        var result=complete(user,response,f,b);
        p.setStatus(result.status());p.setOutcomeReason(result.message());
        if (!result.identityVerified()) feedback.send(user,result.status(),result.message(),false);
        if("REJECTED".equals(result.status()) && !result.documentReadable()) {
            if(!response.path("backReadable").asBoolean(true)){p.setBackPassed(false);p.setBackReason(result.message());}
            else {p.setFrontPassed(false);p.setFrontReason(result.message());}
        }
        save(p);return result;
    }
    private FaceComparisonService.Completion blocked(UUID user,IdentityProgress p,String status,String message) {
        p.setStatus(status);p.setOutcomeReason(message);save(p);feedback.send(user,status,message,false);
        return failedCompletion(status,message);
    }
    private FaceComparisonService.Completion failedCompletion(String status,String message) {
        return new FaceComparisonService.Completion(status,"NO_MATCH",0,.32,false,false,false,false,message);
    }
    private FaceComparisonService.Completion complete(UUID user,JsonNode r,byte[] f,byte[] b) {
        // Legacy workers did not check document quality: never auto-approve their responses.
        if(r.path("policyVersion").asInt(0)!=4) return failedCompletion("ERROR","Dịch vụ đối chiếu chưa tương thích nên chưa thể xác minh tự động. Vui lòng thử lại sau hoặc gửi yêu cầu kiểm tra danh tính.");
        double score=r.path("cosineScore").asDouble(Double.NaN), threshold=r.path("threshold").asDouble(Double.NaN);
        double pad=r.path("padScore").asDouble(Double.NaN);
        boolean motion=r.path("motionPassed").asBoolean(false), anti=r.path("antiSpoofPassed").asBoolean(false);
        boolean quality=r.path("documentQualityPassed").asBoolean(false)
            && r.path("frontQuality").path("passed").asBoolean(false)
            && r.path("backQuality").path("passed").asBoolean(false);
        boolean readable=r.path("documentReadable").asBoolean(false)
            && r.path("frontReadable").asBoolean(false) && r.path("backReadable").asBoolean(false)
            && r.path("documentNumber").asString("").matches("[0-9]{12}");
        if(!Double.isFinite(score) || score< -1 || score>1 || !Double.isFinite(threshold)
                || threshold<.32 || threshold>=1 || !Double.isFinite(pad) || pad<.8 || pad>1 || !motion || !anti)
            return failedCompletion("REVIEW_REQUIRED","Chưa đạt kiểm tra khuôn mặt, động tác hoặc chống giả mạo. Vui lòng quét lại trong điều kiện đủ sáng hoặc gửi yêu cầu kiểm tra danh tính.");
        double selfieScore=r.path("selfieScanScore").asDouble(Double.NaN);
        double selfiePad=r.path("selfiePadScore").asDouble(Double.NaN);
        if(!r.path("selfiePassed").asBoolean(false) || !Double.isFinite(selfieScore) || selfieScore<threshold || selfieScore>1
            || !Double.isFinite(selfiePad) || selfiePad<.8 || selfiePad>1) return failedCompletion("REVIEW_REQUIRED","Selfie chưa đạt kiểm tra khuôn mặt trực tiếp. Vui lòng chụp lại selfie hoặc gửi yêu cầu kiểm tra danh tính.");
        boolean match=score>=threshold;
        if(!quality || !readable) return new FaceComparisonService.Completion("REJECTED",match?"MATCH":"NO_MATCH",score,threshold,motion,anti,readable,false,
            documentRetry(r.path("reasonCode").asString("")));
        String name=java.text.Normalizer.normalize(r.path("fullName").asString(""), java.text.Normalizer.Form.NFC).trim();
        boolean nameReadable=name.length()>=2 && name.length()<=100
            && name.codePoints().allMatch(c->Character.isLetter(c) || c==' ' || c=='.' || c=='\'' || c=='-');
        boolean approved=match && nameReadable;
        byte[] portrait, selfie;
        try { portrait=java.util.Base64.getDecoder().decode(r.path("faceJpeg").asString(""));
            selfie=java.util.Base64.getDecoder().decode(r.path("selfieJpeg").asString("")); }
        catch(Exception e) { return failedCompletion("ERROR","Chưa xử lý được ảnh chân dung từ dịch vụ đối chiếu. Vui lòng thử lại hoặc gửi yêu cầu kiểm tra danh tính."); }
        if(portrait.length<1000 || portrait.length>5*1024*1024 || selfie.length<1000 || selfie.length>5*1024*1024) return failedCompletion("ERROR","Ảnh chân dung trả về chưa hợp lệ. Vui lòng thử lại hoặc gửi yêu cầu kiểm tra danh tính.");
        String evidence;
        try {
            var document=(tools.jackson.databind.node.ObjectNode)r.deepCopy(); document.remove("faceJpeg"); document.remove("selfieJpeg");
            document.put("identityVerified",approved); document.put("verificationSource",approved?"AUTO_RGB_OCR":"MANUAL_REVIEW");
            evidence=json.writeValueAsString(document);
        } catch(Exception e) { return failedCompletion("ERROR","Chưa lưu được kết quả đối chiếu. Vui lòng thử lại sau."); }
        String reason=approved?"Đã xác minh tự động: động tác, selfie trực tiếp, PAD RGB, CCCD và so khớp"
            : !match?"Điểm so khớp CCCD chưa đủ để tự xác minh; có thể thử lại hoặc nhờ ADMIN kiểm tra"
            : "Họ tên OCR chưa đủ rõ; có thể thử lại hoặc nhờ ADMIN kiểm tra";
        var stored=identity.storeScan(user,new com.handsfree.be.service.IdentityService.ScanSubmission(
            f,b,portrait,selfie,name,r.path("documentNumber").asString(""),evidence,score,approved,reason));
        return new FaceComparisonService.Completion(stored.status(),match?"MATCH":"NO_MATCH",score,threshold,true,true,true,
            "VERIFIED".equals(stored.status()),stored.reason());
    }
}
