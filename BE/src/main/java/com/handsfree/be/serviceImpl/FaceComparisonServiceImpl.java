package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
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

/** Local scan and encrypted review evidence. Never grants VERIFIED or unlocks business actions. */
@Service
public class FaceComparisonServiceImpl implements com.handsfree.be.service.FaceComparisonService {
    private final ObjectMapper json;
    private final Semaphore slots = new Semaphore(2);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    @Value("${FACE_COMPARE_ENABLED:false}") private boolean enabled;
    @Value("${FACE_COMPARE_URL:http://localhost:8091/compare}") private String url;
    @Value("${FACE_COMPARE_SHARED_KEY:}") private String key;
    public FaceComparisonServiceImpl(ObjectMapper json, AccountAccess access,
            com.handsfree.be.repository.IdentityRepository identities,
            com.handsfree.be.repository.UserRepository users, IdentityCrypto crypto,
            org.springframework.transaction.support.TransactionTemplate transactions) {
        this.json = json; this.access = access; this.identities = identities;
        this.users = users; this.crypto = crypto; this.transactions = transactions;
    }
    private final AccountAccess access;
    private final com.handsfree.be.repository.IdentityRepository identities;
    private final com.handsfree.be.repository.UserRepository users;
    private final IdentityCrypto crypto;
    private final org.springframework.transaction.support.TransactionTemplate transactions;
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
        } catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED); }
    }
    private tools.jackson.databind.JsonNode call(String method, String suffix, String[] names, byte[][] images) {
        if (!slots.tryAcquire()) throw new AppException(ErrorCode.IDENTITY_SCAN_BUSY);
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
            var response=http.send(request.build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()==410) throw new AppException(ErrorCode.IDENTITY_SESSION_EXPIRED);
            if(response.statusCode()==422 || response.statusCode()==413) throw new AppException(ErrorCode.IDENTITY_SCAN_FAILED);
            if(response.statusCode()==429 || response.statusCode()==503) throw new AppException(ErrorCode.IDENTITY_SCAN_BUSY);
            if(response.statusCode()!=200 || response.body().length()>2000000) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
            return json.readTree(response.body());
        } catch(AppException e) { throw e; }
        catch(InterruptedException e) { Thread.currentThread().interrupt(); throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
        catch(Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
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
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        return new Scan(id,step,count,total,count*100/total,count==total,
            r.path("message").asString("Đang kiểm tra khuôn mặt"),r.path("expiresIn").asInt(0));
    }
    @Override public synchronized Scan start(UUID user,boolean consent) {
        user(user);
        if(!consent) throw new AppException(ErrorCode.VALIDATION_FAILED);
        crypto.validateKey();
        if(identities.existsByUserIdAndStatus(user,"VERIFIED")) throw new AppException(ErrorCode.IDENTITY_ALREADY_VERIFIED);
        sessions.entrySet().removeIf(e->java.time.Instant.now().isAfter(e.getValue().expires()));
        if(sessions.values().stream().anyMatch(s->s.owner().equals(user)) || sessions.size()>=32)
            throw new AppException(ErrorCode.IDENTITY_BUSY);
        var r=call("POST","/sessions",null,null);
        String remote=r.path("sessionId").asString("");
        if(!remote.matches("[A-Za-z0-9_-]{40,60}")) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        UUID id=UUID.randomUUID(); Scan result=scan(id,r);
        sessions.put(id,new Session(user,remote,java.time.Instant.now().plusSeconds(120)));
        return result;
    }
    @Override public Scan frame(UUID user,UUID id,MultipartFile face) {
        var s=owned(user,id);
        return scan(id,call("POST","/sessions/"+s.remote()+"/frame",new String[]{"face"},new byte[][]{jpeg(face)}));
    }
    @Override public void cancel(UUID user,UUID id) {
        var s=owned(user,id);
        sessions.remove(id,s);
        try { call("DELETE","/sessions/"+s.remote(),null,null); }
        catch(AppException ignored) { /* The worker also removes expired sessions. */ }
    }
    @Override public Completion finish(UUID user,UUID id,MultipartFile front,MultipartFile back) {
        var s=owned(user,id);
        byte[] f=jpeg(front), b=jpeg(back);
        if(!sessions.remove(id,s)) throw new AppException(ErrorCode.IDENTITY_SESSION_EXPIRED);
        var r=call("POST","/sessions/"+s.remote()+"/finish",new String[]{"front","back"},new byte[][]{f,b});
        double score=r.path("cosineScore").asDouble(Double.NaN), threshold=r.path("threshold").asDouble(Double.NaN);
        double pad=r.path("padScore").asDouble(Double.NaN);
        boolean motion=r.path("motionPassed").asBoolean(false), anti=r.path("antiSpoofPassed").asBoolean(false);
        boolean readable=r.path("documentReadable").asBoolean(false);
        if(!Double.isFinite(score) || score< -1 || score>1 || !Double.isFinite(threshold)
                || threshold<=0 || threshold>=1 || !Double.isFinite(pad) || pad<.8 || pad>1 || !motion || !anti)
            throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        boolean match=score>=threshold;
        if(!match || !readable) return new Completion("REJECTED",match?"MATCH":"NO_MATCH",score,threshold,motion,anti,readable,false,
            match?"Chưa đọc rõ CCCD. Chụp rõ cả hai mặt rồi thực hiện phiên mới.":"Khuôn mặt chưa khớp CCCD. Hãy kiểm tra ảnh và thực hiện phiên mới.");
        byte[] portrait;
        try { portrait=java.util.Base64.getDecoder().decode(r.path("faceJpeg").asString("")); }
        catch(Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
        if(portrait.length<1000 || portrait.length>5*1024*1024) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
        String evidence;
        try {
            var document=(tools.jackson.databind.node.ObjectNode)r.deepCopy(); document.remove("faceJpeg");
            evidence=json.writeValueAsString(document);
        } catch(Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
        transactions.executeWithoutResult(tx->{
            users.lockById(user).orElseThrow(()->new AppException(ErrorCode.USER_NOT_FOUND));
            var i=identities.findById(user).orElseGet(()->{
                var n=new com.handsfree.be.entity.IdentityVerification(); n.setUserId(user); return n;
            });
            if("VERIFIED".equals(i.getStatus())) throw new AppException(ErrorCode.IDENTITY_ALREADY_VERIFIED);
            if("PROCESSING".equals(i.getStatus()) && i.getSubmittedAt()!=null && i.getSubmittedAt().isAfter(java.time.Instant.now().minusSeconds(300)))
                throw new AppException(ErrorCode.IDENTITY_BUSY);
            i.setStatus("REVIEW_REQUIRED"); i.setSubmittedAt(java.time.Instant.now()); i.setConsentAt(i.getSubmittedAt());
            i.setVerifiedAt(null); i.setReason("Đã đạt kiểm tra động tác, chống giả mạo RGB và so khớp. CCCD cần xác thực tính hợp lệ.");
            i.setFullName(null); i.setDocumentData(crypto.encrypt(evidence));
            i.setFrontImage(crypto.encrypt(f)); i.setBackImage(crypto.encrypt(b)); i.setFaceImage(crypto.encrypt(portrait));
            i.setSimilarity(score); i.setLive(true); identities.saveAndFlush(i);
        });
        return new Completion("REVIEW_REQUIRED","MATCH",score,threshold,true,true,true,false,
            "Đã hoàn thành quét và đối chiếu. Hồ sơ được lưu riêng tư; CCCD vẫn cần xác thực tính hợp lệ trước khi mở quyền đăng/nhận việc.");
    }
}
