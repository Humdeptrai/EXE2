package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Semaphore;

/** App verification from server-owned motion/PAD sessions and document quality; not certified eKYC. */
@Service
@Slf4j
public class FaceComparisonServiceImpl implements com.handsfree.be.service.FaceComparisonService {
    private final ObjectMapper json;
    private final Semaphore slots = new Semaphore(2);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    @Value("${FACE_COMPARE_ENABLED:false}") private boolean enabled;
    @Value("${FACE_COMPARE_URL:http://localhost:8091/compare}") private String url;
    @Value("${FACE_COMPARE_SHARED_KEY:}") private String key;
    public FaceComparisonServiceImpl(ObjectMapper json, AccountAccess access,
            IdentityCrypto crypto, com.handsfree.be.service.IdentityService identity) {
        this.json = json; this.access = access; this.crypto = crypto; this.identity = identity;
    }
    private final AccountAccess access;
    private final IdentityCrypto crypto;
    private final com.handsfree.be.service.IdentityService identity;
    private final java.util.concurrent.ConcurrentHashMap<UUID, Session> sessions = new java.util.concurrent.ConcurrentHashMap<>();
    private record Session(UUID owner, String remote, java.time.Instant expires) {}



    private void part(ByteArrayOutputStream body, String boundary, String name, byte[] bytes) throws Exception {
        body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name
                + "\"; filename=\"image.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(bytes); body.write("\r\n".getBytes(StandardCharsets.UTF_8));
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
                    ImageIO.write(reader.read(0), "jpg", out);
                    if (out.size() > 5 * 1024 * 1024) throw new IllegalArgumentException();
                    return out.toByteArray();
                } finally { reader.dispose(); }
            }
        } catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_SCAN_MEDIA); }
    }

    private void user(UUID user) {
        if (access.active(user).getRole() != com.handsfree.be.constant.UserRole.USER)
            throw new AppException(ErrorCode.FORBIDDEN);
    }
    private URI endpoint(String suffix) {
        try {
            URI base = URI.create(url);
            boolean local = "localhost".equals(base.getHost()) || "127.0.0.1".equals(base.getHost());
            if (!enabled || key.length()<32 || base.getUserInfo()!=null || base.getQuery()!=null
                    || base.getFragment()!=null || base.getHost()==null
                    || !("https".equals(base.getScheme()) || local && "http".equals(base.getScheme())))
                throw new IllegalArgumentException();
            return new URI(base.getScheme(), null, base.getHost(), base.getPort(), suffix, null, null);
        } catch (Exception e) {
            log.warn("Face worker configuration invalid: enabled={}, sharedKeyValid={}, reason={}",
                    enabled, key.length() >= 32, e.getClass().getSimpleName());
            throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED);
        }
    }
    private AppException invalidResponse(String operation, String reason) {
        log.warn("Face worker invalid response: operation={}, reason={}", operation, reason);
        return new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
    }
    private tools.jackson.databind.JsonNode call(String method, String suffix, String[] names, byte[][] images) {
        if (!slots.tryAcquire()) throw new AppException(ErrorCode.IDENTITY_SCAN_BUSY);
        long started = System.nanoTime();
        String operation = suffix.replaceAll("/sessions/[^/]+", "/sessions/{session}");
        try {
            var request = HttpRequest.newBuilder(endpoint(suffix)).timeout(Duration.ofSeconds(60)).header("X-Face-Key", key);
            if (images == null) request.method(method, HttpRequest.BodyPublishers.noBody());
            else {
                String boundary="hf"+UUID.randomUUID().toString().replace("-", "");
                var body=new ByteArrayOutputStream();
                for(int i=0;i<images.length;i++) part(body,boundary,names[i],images[i]);
                body.write(("--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
                request.header("Content-Type","multipart/form-data; boundary="+boundary)
                    .method(method,HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()));
            }
            var outgoing = request.build();
            var response=http.send(outgoing,HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("Face worker HTTP failure: operation={} {}, host={}, status={}, elapsedMs={}",
                        method, operation, outgoing.uri().getHost(), response.statusCode(),
                        (System.nanoTime() - started) / 1_000_000);
            }
            if(response.statusCode()==410) throw new AppException(ErrorCode.IDENTITY_SESSION_EXPIRED);
            if(response.statusCode()==422 || response.statusCode()==413) throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
            if(response.statusCode()==429 || response.statusCode()==503) throw new AppException(ErrorCode.IDENTITY_SCAN_BUSY);
            if(response.statusCode()!=200) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
            if(response.body().length()>4000000) throw invalidResponse(operation, "response_too_large");
            return json.readTree(response.body());
        } catch(AppException e) { throw e; }
        catch(InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Face worker request interrupted: operation={} {}, elapsedMs={}",
                    method, operation, (System.nanoTime() - started) / 1_000_000);
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        }
        catch(Exception e) {
            // Do not log response bodies, session tokens, keys, images or OCR data.
            log.warn("Face worker request failed: operation={} {}, exception={}, elapsedMs={}",
                    method, operation, e.getClass().getSimpleName(), (System.nanoTime() - started) / 1_000_000);
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        }
        finally { slots.release(); }
    }
    private Session owned(UUID user,UUID id) {
        user(user);
        Session s=sessions.get(id);
        if(s==null || !s.owner().equals(user) || java.time.Instant.now().isAfter(s.expires()))
            throw new AppException(ErrorCode.IDENTITY_SESSION_EXPIRED);
        return s;
    }
    private Scan scan(UUID id,tools.jackson.databind.JsonNode r) {
        int count=r.path("completed").asInt(-1), total=r.path("total").asInt(-1);
        String step=r.path("step").asString("");
        if(total!=9 || count<0 || count>total || !java.util.Set.of("CENTER","LEFT","RIGHT","UP","DOWN","DONE").contains(step))
            throw invalidResponse("scan", "scan_contract_mismatch");
        return new Scan(id,step,count,total,count*100/total,count==total,
            r.path("message").asString("Đang kiểm tra khuôn mặt"),r.path("expiresIn").asInt(0));
    }
    @Override public synchronized Scan start(UUID user,boolean consent) {
        user(user);
        if(!consent) throw new AppException(ErrorCode.VALIDATION_FAILED);
        crypto.validateKey();
        sessions.entrySet().removeIf(e->java.time.Instant.now().isAfter(e.getValue().expires()));
        if(sessions.values().stream().anyMatch(s->s.owner().equals(user)) || sessions.size()>=32)
            throw new AppException(ErrorCode.IDENTITY_BUSY);
        var r=call("POST","/sessions",null,null);
        String remote=r.path("sessionId").asString("");
        if(!remote.matches("[A-Za-z0-9_-]{40,60}")) throw invalidResponse("start", "session_id_invalid");
        UUID id=UUID.randomUUID(); Scan result=scan(id,r);
        sessions.put(id,new Session(user,remote,java.time.Instant.now().plusSeconds(300)));
        return result;
    }
    @Override public Scan frame(UUID user,UUID id,MultipartFile face) {
        var s=owned(user,id);
        return scan(id,call("POST","/sessions/"+s.remote()+"/frame",new String[]{"face"},new byte[][]{jpeg(face)}));
    }
    @Override public SelfieCapture selfie(UUID user,UUID id,MultipartFile image) {
        var s=owned(user,id);
        var r=call("POST","/sessions/"+s.remote()+"/selfie",new String[]{"selfie"},new byte[][]{jpeg(image)});
        if(r.path("policyVersion").asInt(0)!=3 || !r.path("accepted").asBoolean(false))
            throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
        return new SelfieCapture(true,"Selfie đã khớp với phiên quét. Tiếp tục cung cấp CCCD hai mặt.",r.path("expiresIn").asInt(0));
    }
    @Override public void cancel(UUID user,UUID id) {
        var s=owned(user,id);
        sessions.remove(id,s);
        try { call("DELETE","/sessions/"+s.remote(),null,null); }
        catch(AppException ignored) { /* The worker also removes expired sessions. */ }
    }
    private String documentRetry(String reason) {
        return switch(reason) {
            case "FRONT_QUALITY" -> "Mặt trước CCCD chưa đủ rõ hoặc chưa thấy đủ bốn góc. Đặt giấy tờ trên nền tương phản, chụp gần và tránh chói rồi quét lại.";
            case "BACK_QUALITY" -> "Mặt sau CCCD chưa đủ rõ hoặc chưa thấy đủ bốn góc. Chụp lại mặt sau, tránh mờ và chói rồi thực hiện phiên mới.";
            case "FRONT_OCR" -> "Chưa đọc rõ thông tin mặt trước CCCD. Chụp gần hơn, giữ giấy tờ ngay ngắn và thực hiện phiên mới.";
            case "BACK_OCR" -> "Chưa đọc rõ thông tin mặt sau CCCD. Chụp gần hơn, giữ giấy tờ ngay ngắn và thực hiện phiên mới.";
            case "FRONT_FACE" -> "Chưa nhận rõ đúng một khuôn mặt trên CCCD. Chụp rõ ảnh chân dung ở mặt trước rồi thực hiện phiên mới.";
            default -> "CCCD chưa đủ điều kiện đối chiếu. Chụp rõ, đúng hai mặt giấy tờ rồi thực hiện phiên mới.";
        };
    }
    @Override public Completion finish(UUID user,UUID id,MultipartFile front,MultipartFile back) {
        var s=owned(user,id);
        byte[] f=jpeg(front), b=jpeg(back);
        if(!sessions.remove(id,s)) throw new AppException(ErrorCode.IDENTITY_SESSION_EXPIRED);
        var r=call("POST","/sessions/"+s.remote()+"/finish",new String[]{"front","back"},new byte[][]{f,b});
        // Legacy workers did not check document quality: never auto-approve their responses.
        if(r.path("policyVersion").asInt(0)!=3) throw invalidResponse("finish", "policy_version_mismatch");
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
                || threshold<.363 || threshold>=1 || !Double.isFinite(pad) || pad<.8 || pad>1 || !motion || !anti)
            throw invalidResponse("finish", "face_or_pad_metrics_invalid");
        double selfieScore=r.path("selfieScanScore").asDouble(Double.NaN);
        double selfiePad=r.path("selfiePadScore").asDouble(Double.NaN);
        if(!r.path("selfiePassed").asBoolean(false) || !Double.isFinite(selfieScore) || selfieScore<threshold || selfieScore>1
            || !Double.isFinite(selfiePad) || selfiePad<.8 || selfiePad>1) throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
        boolean match=score>=threshold;
        if(!quality || !readable) return new Completion("REJECTED",match?"MATCH":"NO_MATCH",score,threshold,motion,anti,readable,false,
            documentRetry(r.path("reasonCode").asString("")));
        if(score<.30) return new Completion("REJECTED","NO_MATCH",score,threshold,motion,anti,readable,false,
            "Khuôn mặt chưa đủ tương đồng với ảnh trên CCCD. Chụp rõ mặt trước, dùng đúng CCCD của bạn rồi quét lại.");
        String name=r.path("fullName").asString("").trim();
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
        return new Completion(approved?"VERIFIED":"REVIEW_REQUIRED",match?"MATCH":"NO_MATCH",score,threshold,true,true,true,approved,
            approved?"Xác minh tự động thành công. Bạn có thể đăng hoặc nhận việc khi thông tin hồ sơ đã đầy đủ."
            : "Chưa đủ điều kiện xác minh tự động. Bạn có thể chụp lại CCCD và quét lại, hoặc nhờ ADMIN kiểm tra hồ sơ đã gửi.");
    }
}
