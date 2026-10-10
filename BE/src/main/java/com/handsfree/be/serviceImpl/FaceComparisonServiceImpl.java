package com.handsfree.be.serviceImpl;
import com.handsfree.be.exception.*;
import com.handsfree.be.service.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
@Service
public class FaceComparisonServiceImpl implements FaceComparisonService {
    private final AccountAccess access;
    private final IdentityCrypto crypto;
    private final FaceWorkerClient worker;
    private final IdentityProgressService progress;
    private final java.util.concurrent.ConcurrentHashMap<UUID,Session> sessions=new java.util.concurrent.ConcurrentHashMap<>();
    private record Session(UUID owner,String remote,java.time.Instant expires) {}
    public FaceComparisonServiceImpl(AccountAccess access,IdentityCrypto crypto,FaceWorkerClient worker,IdentityProgressService progress) {
        this.access=access;this.crypto=crypto;this.worker=worker;this.progress=progress;
    }
    private JsonNode call(String method,String path,String[] names,byte[][] images) { return worker.send(method,path,names,images); }
    private AppException invalidResponse(String operation,String reason) { return new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
    private void user(UUID id) { if(access.active(id).getRole()!=com.handsfree.be.constant.UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN); }
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
        if(total!=6 || count<0 || count>total || !java.util.Set.of("CENTER","LEFT","RIGHT","UP","DOWN","DONE").contains(step))
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
        var response=call("POST","/sessions/"+s.remote()+"/frame",new String[]{"face"},new byte[][]{jpeg(face)});
        var result=scan(id,response);
        if(result.complete()) {
            progress.saveScan(user,response.path("checkpoint").asString(""));
            sessions.remove(id,s);
        }
        return result;
    }
    @Override public SelfieCapture selfie(UUID user,UUID id,MultipartFile image) {
        var saved=progress.selfie(user,image);
        return new SelfieCapture(saved.selfiePassed(),"Selfie đã được lưu. Tiếp tục cung cấp CCCD.",0);
    }
    @Override public Completion finish(UUID user,UUID id,MultipartFile front,MultipartFile back) {
        progress.document(user,"front",front);progress.document(user,"back",back);
        return progress.finish(user);
    }
    @Override public void cancel(UUID user,UUID id) {
        user(user);
        var s=sessions.get(id);
        if(s==null) return;
        if(!s.owner().equals(user)) throw new AppException(ErrorCode.FORBIDDEN);
        if(sessions.remove(id,s)) call("DELETE","/sessions/"+s.remote(),null,null);
    }
}
