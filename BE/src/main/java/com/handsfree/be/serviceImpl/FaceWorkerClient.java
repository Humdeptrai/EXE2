package com.handsfree.be.serviceImpl;
import com.handsfree.be.exception.*;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Semaphore;
@Component @Slf4j @RequiredArgsConstructor
public class FaceWorkerClient {
    private final ObjectMapper json;
    private final Semaphore slots=new Semaphore(2);
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    @Value("${FACE_COMPARE_ENABLED:false}") private boolean enabled;
    @Value("${FACE_COMPARE_URL:http://localhost:8091/compare}") private String url;
    @Value("${FACE_COMPARE_SHARED_KEY:}") private String key;
    private void part(ByteArrayOutputStream body, String boundary, String name, byte[] bytes) throws Exception {
        body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name
                + "\"; filename=\"image.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(bytes); body.write("\r\n".getBytes(StandardCharsets.UTF_8));
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
    public tools.jackson.databind.JsonNode send(String method, String suffix, String[] names, byte[][] images) {
        if (!slots.tryAcquire()) throw new AppException(ErrorCode.IDENTITY_SCAN_BUSY);
        long started = System.nanoTime();
        String operation = suffix.replaceAll("/sessions/[^/]+", "/sessions/{session}");
        try {
            var request = HttpRequest.newBuilder(endpoint(suffix)).timeout(Duration.ofSeconds(suffix.endsWith("/finish") || suffix.startsWith("/checkpoints/") ? 120 : 60)).header("X-Face-Key", key);
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
            if(response.body().length()>24*1024*1024) throw invalidResponse(operation, "response_too_large");
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
}
