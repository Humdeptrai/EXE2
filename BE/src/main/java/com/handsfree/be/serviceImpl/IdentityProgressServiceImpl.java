package com.handsfree.be.serviceImpl;
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
    private final IdentityProgressRepository repository;
    private final UserRepository users;
    private final AccountAccess access;
    private final IdentityCrypto crypto;
    private final FaceWorkerClient worker;
    private final ObjectMapper json;
    private final IdentityService identity;
    private void user(UUID user) { if(access.active(user).getRole()!=com.handsfree.be.constant.UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN); }
    private IdentityProgress locked(UUID id) {
        user(id);users.lockById(id).orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
        identity.requireNoOpenAppeal(id);
        return repository.lockById(id).orElseGet(()->{ var p=new IdentityProgress();p.setUserId(id);p.setStatus("DRAFT");return p; });
    }
    private void save(IdentityProgress p) { p.setUpdatedAt(Instant.now());repository.saveAndFlush(p); }
    private Progress summary(IdentityProgress p) {
        if(p==null) return new Progress(false,false,false,false,null,null,"DRAFT",null,null,null,null,null,0);
        return new Progress(p.getCheckpoint()!=null,p.isSelfiePassed(),p.isFrontPassed(),p.isBackPassed(),
            p.getFrontReason(),p.getBackReason(),p.getStatus(),crypto.text(p.getDocumentNumber()),
            p.getSelfieImage()==null?null:"/identity/progress/images/selfie",
            p.getFrontImage()==null?null:"/identity/progress/images/front",
            p.getBackImage()==null?null:"/identity/progress/images/back",p.getUpdatedAt(),p.getVersion());
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
        p.setCheckpoint(crypto.encrypt(token));
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
    @Override @Transactional(readOnly=true) public Progress get(UUID user) {
        user(user);var p=repository.findById(user).orElse(null);var active=identity.mine(user);
        boolean activeComplete="VERIFIED".equals(active.verification().status()) && active.selfieVerified() && active.documentConfirmed();
        boolean newerApproval=p!=null && p.getUpdatedAt()!=null && active.verification().verifiedAt()!=null
            && active.verification().verifiedAt().isAfter(p.getUpdatedAt());
        if(activeComplete && (p==null || "VERIFIED".equals(p.getStatus()) || newerApproval))
            return new Progress(true,true,true,true,null,null,"VERIFIED",active.documentNumber(),active.selfieUrl(),
                p==null || p.getFrontImage()==null?null:"/identity/progress/images/front",
                p==null || p.getBackImage()==null?null:"/identity/progress/images/back",active.verification().verifiedAt(),p==null?0:p.getVersion());
        return summary(p);
    }
    @Override @Transactional public void saveScan(UUID user,String token) {
        var p=locked(user);var data=payload(token);
        if(data.path("policyVersion").asInt(0)!=4 || data.path("total").asInt(0)!=6 || token.length()>20*1024*1024)
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        // Re-delivery of the last frame must not erase already saved subsequent steps.
        if(p.getCheckpoint()!=null && payload(crypto.text(p.getCheckpoint())).path("nonce").asString("").equals(data.path("nonce").asString(""))) return;
        p.setCheckpoint(crypto.encrypt(token));p.setFaceImage(crypto.encrypt(java.util.Base64.getDecoder().decode(data.path("portrait").asString(""))));
        p.setSelfiePassed(false);p.setSelfieImage(null);p.setFrontPassed(false);p.setBackPassed(false);
        p.setFrontImage(null);p.setBackImage(null);p.setDocumentNumber(null);p.setFrontReason(null);p.setBackReason(null);p.setStatus("DRAFT");save(p);
    }
    @Override @Transactional public Progress selfie(UUID user,MultipartFile image) {
        var p=locked(user);if(p.getCheckpoint()==null) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        byte[] raw=jpeg(image);
        var response=worker.send("POST","/checkpoints/selfie",new String[]{"checkpoint","selfie"},new byte[][]{crypto.decrypt(p.getCheckpoint()),raw});
        if(!response.path("accepted").asBoolean(false)) throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
        checkpoint(p,response);p.setSelfieImage(crypto.encrypt(raw));p.setSelfiePassed(true);
        p.setFrontPassed(false);p.setBackPassed(false);p.setFrontReason(null);p.setBackReason(null);p.setStatus("DRAFT");save(p);return summary(p);
    }
    @Override @Transactional public Progress document(UUID user,String side,MultipartFile image) {
        if(!java.util.Set.of("front","back").contains(side)) throw new AppException(ErrorCode.VALIDATION_FAILED);
        var p=locked(user);if(!p.isSelfiePassed()) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        byte[] raw=jpeg(image);var response=worker.send("POST","/checkpoints/"+side,new String[]{"checkpoint",side},new byte[][]{crypto.decrypt(p.getCheckpoint()),raw});
        checkpoint(p,response);boolean passed=response.path("passed").asBoolean(false);String reason=response.path("reasonCode").asString("");
        if(side.equals("front")) {
            p.setFrontImage(crypto.encrypt(raw));p.setFrontPassed(passed);p.setFrontReason(passed?null:documentRetry(reason));
            var info=payload(crypto.text(p.getCheckpoint())).path("documents").path("front");
            String number=info.path("documentNumber").asString("");p.setDocumentNumber(passed && number.matches("[0-9]{12}")?crypto.encrypt(number):null);
        } else { p.setBackImage(crypto.encrypt(raw));p.setBackPassed(passed);p.setBackReason(passed?null:documentRetry(reason)); }
        p.setStatus("DRAFT");save(p);return summary(p);
    }
    @Override @Transactional(readOnly=true) public byte[] image(UUID user,String side) {
        user(user);var p=repository.findById(user).orElseThrow(()->new AppException(ErrorCode.IDENTITY_REQUIRED));
        byte[] encrypted=switch(side) { case "selfie"->p.getSelfieImage();case "front"->p.getFrontImage();case "back"->p.getBackImage();case "face"->p.getFaceImage();default->throw new AppException(ErrorCode.VALIDATION_FAILED); };
        if(encrypted==null) throw new AppException(ErrorCode.IDENTITY_REQUIRED);return crypto.decrypt(encrypted);
    }
    private String documentRetry(String reason) {
        return switch(reason) {
            case "FRONT_QUALITY_CARD_FRAME", "BACK_QUALITY_CARD_FRAME" -> "Chưa nhận diện được đường viền CCCD trong ảnh. Chọn ảnh có đủ toàn bộ thẻ, viền tách khỏi nền và một khoảng nền quanh thẻ.";
            case "FRONT_QUALITY_TOO_SMALL", "BACK_QUALITY_TOO_SMALL" -> "CCCD trong ảnh có độ phân giải quá thấp. Chọn ảnh gốc hoặc chụp gần hơn, giữ toàn bộ thẻ trong ảnh.";
            case "FRONT_QUALITY_BLUR", "BACK_QUALITY_BLUR" -> "Chi tiết trên CCCD chưa đủ nét để đọc. Chọn ảnh gốc rõ chữ hoặc lấy nét lại vào thẻ.";
            case "FRONT_QUALITY_LIGHTING", "BACK_QUALITY_LIGHTING" -> "Ánh sáng trên CCCD chưa phù hợp. Tránh bóng đổ, vùng tối hoặc phản sáng che chữ.";
            case "FRONT_OCR" -> "Chưa đọc rõ mặt trước CCCD. Chụp lại mặt trước, giữ đủ bốn góc và chữ rõ nét.";
            case "BACK_OCR" -> "Chưa đọc rõ mặt sau CCCD. Chỉ cần chụp lại mặt sau; các bước đã đạt được giữ lại.";
            case "FRONT_FACE" -> "Chưa nhận rõ khuôn mặt trên CCCD. Chụp lại mặt trước.";
            case "BACK_QUALITY" -> "Mặt sau chưa rõ hoặc thiếu góc. Chụp lại mặt sau.";
            default -> "Mặt trước chưa rõ hoặc thiếu góc. Chụp lại mặt trước.";
        };
    }
    @Override @Transactional public FaceComparisonService.Completion finish(UUID user) {
        var p=locked(user);
        if(!p.isSelfiePassed() || !p.isFrontPassed() || !p.isBackPassed()) throw new AppException(ErrorCode.IDENTITY_REQUIRED);
        byte[] f=crypto.decrypt(p.getFrontImage()),b=crypto.decrypt(p.getBackImage());
        if("VERIFIED".equals(p.getStatus()) && "VERIFIED".equals(identity.status(user).status()))
            return new FaceComparisonService.Completion("VERIFIED","MATCH",0,.32,true,true,true,true,"Hồ sơ đã được xác minh và lưu.");
        var response=worker.send("POST","/checkpoints/finish",new String[]{"checkpoint","front","back"},new byte[][]{crypto.decrypt(p.getCheckpoint()),f,b});
        var result=complete(user,response,f,b);
        p.setStatus(result.status());
        if("REJECTED".equals(result.status()) && !result.documentReadable()) { p.setFrontPassed(false);p.setFrontReason(result.message()); }
        save(p);return result;
    }
    private FaceComparisonService.Completion complete(UUID user,JsonNode r,byte[] f,byte[] b) {
        // Legacy workers did not check document quality: never auto-approve their responses.
        if(r.path("policyVersion").asInt(0)!=4) throw invalidResponse("finish", "policy_version_mismatch");
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
            throw invalidResponse("finish", "face_or_pad_metrics_invalid");
        double selfieScore=r.path("selfieScanScore").asDouble(Double.NaN);
        double selfiePad=r.path("selfiePadScore").asDouble(Double.NaN);
        if(!r.path("selfiePassed").asBoolean(false) || !Double.isFinite(selfieScore) || selfieScore<threshold || selfieScore>1
            || !Double.isFinite(selfiePad) || selfiePad<.8 || selfiePad>1) throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
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
        catch(Exception e) { throw invalidResponse("finish", "portrait_encoding_invalid"); }
        if(portrait.length<1000 || portrait.length>5*1024*1024 || selfie.length<1000 || selfie.length>5*1024*1024) throw invalidResponse("finish", "portrait_size_invalid");
        String evidence;
        try {
            var document=(tools.jackson.databind.node.ObjectNode)r.deepCopy(); document.remove("faceJpeg"); document.remove("selfieJpeg");
            document.put("identityVerified",approved); document.put("verificationSource",approved?"AUTO_RGB_OCR":"MANUAL_REVIEW");
            evidence=json.writeValueAsString(document);
        } catch(Exception e) { throw invalidResponse("finish", "evidence_serialization_failed"); }
        String reason=approved?"Đã xác minh tự động: động tác, selfie trực tiếp, PAD RGB, CCCD và so khớp"
            : !match?"Điểm so khớp CCCD chưa đủ để tự xác minh; có thể thử lại hoặc nhờ ADMIN kiểm tra"
            : "Họ tên OCR chưa đủ rõ; có thể thử lại hoặc nhờ ADMIN kiểm tra";
        identity.storeScan(user,new com.handsfree.be.service.IdentityService.ScanSubmission(
            f,b,portrait,selfie,name,r.path("documentNumber").asString(""),evidence,score,approved,reason));
        return new FaceComparisonService.Completion(approved?"VERIFIED":score<.30?"REJECTED":"REVIEW_REQUIRED",match?"MATCH":"NO_MATCH",score,threshold,true,true,true,approved,
            approved?"Xác minh tự động thành công. Bạn có thể đăng hoặc nhận việc khi thông tin hồ sơ đã đầy đủ."
            : !match ? "Khuôn mặt chưa đủ khớp với ảnh CCCD. Các bước đã lưu được giữ lại; bạn có thể thử lại hoặc gửi yêu cầu ADMIN xét duyệt."
            : "Họ tên OCR chưa đủ rõ. Các bước đã lưu được giữ lại; bạn có thể thử lại hoặc gửi yêu cầu ADMIN xét duyệt.");
    }
}
