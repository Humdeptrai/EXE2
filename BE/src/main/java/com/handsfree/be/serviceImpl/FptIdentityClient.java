package com.handsfree.be.serviceImpl;

import com.handsfree.be.properties.IdentityProperties;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component @RequiredArgsConstructor
public class FptIdentityClient {
    private final IdentityProperties properties;
    private final ObjectMapper json;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public record Part(String field, String filename, String type, byte[] bytes) {}
    public record Result(boolean verified, String reason, String name, String document, double similarity, boolean live) {}
    public Result verify(byte[] front, byte[] back, byte[] face, byte[] video) {
        var f = ocr(front); var b = ocr(back);
        var live = post(properties.getLivenessUrl(), List.of(
                new Part("video", "face.mp4", "video/mp4", video),
                new Part("cmnd", "face.jpg", "image/jpeg", face)));
        var match = post(properties.getFaceMatchUrl(), List.of(
                new Part("file[]", "face.jpg", "image/jpeg", face),
                new Part("file[]", "front.jpg", "image/jpeg", front)));
        return assess(f, b, live, match);
    }
    Result assess(JsonNode f, JsonNode b, JsonNode live, JsonNode match) {
        String id = f.path("id").asString(""); String name = f.path("name").asString("");
        boolean documentOk = id.matches("[0-9]{12}") && !name.isBlank() && !name.equals("N/A")
                && !f.path("type").asString("").contains("back")
                && b.path("type").asString("").contains("back")
                && f.path("id_prob").asDouble(0) >= 0.8 && f.path("name_prob").asDouble(0) >= 0.8;
        String expiry = f.path("doe").asString("");
        if (expiry.matches("[0-9]{2}/[0-9]{2}/[0-9]{4}")) {
            try { documentOk &= !LocalDate.parse(expiry, DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(java.time.format.ResolverStyle.STRICT)).isBefore(LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))); }
            catch (Exception e) { documentOk = false; }
        }
        JsonNode l = live.has("liveness") ? live.path("liveness") : live;
        String deepfake = l.path("is_deepfake").asString("");
        // v3 documents N/A when the optional deepfake analysis is not returned (e.g. HD input).
        // It is not a negative deepfake verdict; liveness + review + both face matches remain mandatory.
        boolean deepfakeNotFlagged = "false".equalsIgnoreCase(deepfake) || "N/A".equalsIgnoreCase(deepfake);
        boolean isLive = live.path("code").asString("").equals("200")
                && truth(l.path("is_live")) && "false".equalsIgnoreCase(l.path("need_to_review").asString(""))
                && deepfakeNotFlagged
                && truth(live.path("face_match").path("isMatch"))
                && live.path("face_match").path("similarity").asDouble(0) >= properties.getMinSimilarity();
        double similarity = match.path("data").path("similarity").asDouble(0);
        boolean same = match.path("code").asString("").equals("200")
                && truth(match.path("data").path("isMatch"))
                && "false".equalsIgnoreCase(match.path("data").path("isBothImgIDCard").asString(""))
                && similarity >= properties.getMinSimilarity();
        boolean verified = documentOk && isLive && same;
        String reason = verified ? "Xác thực thành công" : !documentOk
                ? "Không đọc được CCCD hợp lệ. Vui lòng chụp rõ cả hai mặt và gửi lại."
                : !isLive ? "Video chưa vượt qua kiểm tra người thật hoặc không khớp ảnh khuôn mặt. Hãy quay lại ở nơi đủ sáng."
                : "Khuôn mặt chưa khớp ảnh CCCD. Vui lòng chụp và gửi lại.";
        String document = "{\"front\":" + f + ",\"back\":" + b + "}";
        return new Result(verified, reason, name, document, similarity, isLive);
    }
    private boolean truth(JsonNode node) { return "true".equalsIgnoreCase(node.asString("")); }
    private JsonNode ocr(byte[] image) {
        var response = post(properties.getOcrUrl(), List.of(new Part("image", "document.jpg", "image/jpeg", image)));
        if (response.path("errorCode").asInt(-1) != 0 || response.path("data").size() != 1)
            return json.createObjectNode();
        return response.path("data").get(0);
    }
    private JsonNode post(String url, List<Part> parts) {
        try {
            URI uri = URI.create(url);
            if (!"https".equals(uri.getScheme()) || !"api.fpt.ai".equals(uri.getHost()))
                throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED);
            String boundary = "hf" + UUID.randomUUID().toString().replace("-", "");
            var body = new ByteArrayOutputStream();
            for (Part p : parts) {
                body.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + p.field()
                        + "\"; filename=\"" + p.filename() + "\"\r\nContent-Type: " + p.type() + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
                body.write(p.bytes()); body.write("\r\n".getBytes(StandardCharsets.UTF_8));
            }
            body.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
            var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(35))
                    .header("api-key", properties.getApiKey())
                    .header("api_key", properties.getApiKey())
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR);
            return json.readTree(response.body());
        } catch (AppException e) { throw e; }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
        catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR); }
    }
}
