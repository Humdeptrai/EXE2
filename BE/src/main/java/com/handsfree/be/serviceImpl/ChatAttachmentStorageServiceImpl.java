package com.handsfree.be.serviceImpl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.handsfree.be.exception.*;
import com.handsfree.be.properties.CloudinaryProperties;
import com.handsfree.be.properties.StorageProperties;
import com.handsfree.be.service.ChatAttachmentStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.time.Duration;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j
public class ChatAttachmentStorageServiceImpl implements ChatAttachmentStorageService {
    private final StorageProperties storage;
    private final CloudinaryProperties cloudinaryProperties;
    private final ObjectProvider<Cloudinary> cloudinary;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL).build();

    private Path directory() {
        // A sibling of the public jobs directory, never registered with a resource handler.
        return Path.of(storage.uploadDir()).toAbsolutePath().normalize().resolveSibling("chat-attachments");
    }
    private Path localPath(String key) {
        Path target = directory().resolve(key).normalize();
        if (!target.startsWith(directory()) || target.equals(directory())) throw new AppException(ErrorCode.INVALID_FILE_PATH);
        return target;
    }
    @Override
    public Stored store(MultipartFile file) {
        String extension = switch (file.getContentType()) {
            case "image/png" -> ".png"; case "image/webp" -> ".webp"; case "video/mp4" -> ".mp4"; case "application/pdf" -> ".pdf"; case "text/plain" -> ".txt"; default -> ".jpg";
        };
        String key = UUID.randomUUID() + extension;
        String resourceType = "video/mp4".equals(file.getContentType()) ? "video" : file.getContentType().startsWith("image/") ? "image" : "raw";
        String publicId = cloudinaryProperties.normalizedFolder() + "/chat-attachments/" + UUID.randomUUID();
        if (resourceType.equals("raw")) publicId += extension;
        Path temporary = null;
        try {
            if (!"cloudinary".equals(storage.provider())) {
                Files.createDirectories(directory());
                try (InputStream in = file.getInputStream()) { Files.copy(in, localPath(key)); }
                return new Stored("local", key);
            }
            temporary = Files.createTempFile("handsfree-chat-", extension);
            file.transferTo(temporary);
            // Use a single upload for photos/files; reserve chunked upload for large videos.
            // Originals stay authenticated and retain their dimensions and format.
            var options = ObjectUtils.asMap("resource_type", resourceType, "type", "authenticated",
                    "public_id", publicId, "overwrite", false, "timeout", 120000);
            if (file.getSize() <= 20L * 1024 * 1024) cloudinary.getObject().uploader().upload(temporary.toFile(), options);
            else {
                options.put("chunk_size", 20 * 1024 * 1024);
                cloudinary.getObject().uploader().uploadLarge(temporary.toFile(), options);
            }
            return new Stored("cloudinary", resourceType + ":" + publicId);
        } catch (Exception e) {
            delete(new Stored("cloudinary".equals(storage.provider()) ? "cloudinary" : "local",
                    "cloudinary".equals(storage.provider()) ? resourceType + ":" + publicId : key));
            log.error("Chat attachment upload failed", e);
            throw new AppException(ErrorCode.FILE_STORAGE_FAILED);
        } finally {
            if (temporary != null) try { Files.deleteIfExists(temporary); } catch (IOException ignored) {}
        }
    }
    @Override
    public InputStream open(Source evidence) {
        try {
            if ("local".equals(evidence.provider())) return Files.newInputStream(localPath(evidence.key()));
            if (!"cloudinary".equals(evidence.provider())) throw new AppException(ErrorCode.FILE_STORAGE_FAILED);
            // The signed URL stays on the backend. Clients only use the authenticated HandsFree chat API.
            String[] parts = cloudKey(evidence.key());
            String format = switch (evidence.contentType()) {
                case "image/png" -> "png"; case "image/webp" -> "webp"; case "video/mp4" -> "mp4"; default -> "jpg";
            };
            var builder = cloudinary.getObject().url().resourceType(parts[0]).type("authenticated").secure(true).signed(true);
            if (!parts[0].equals("raw")) builder.format(format);
            String url = builder.generate(parts[1]);
            HttpResponse<InputStream> result = client.send(HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofMinutes(5)).GET().build(), HttpResponse.BodyHandlers.ofInputStream());
            if (result.statusCode() != 200) { result.body().close(); throw new AppException(ErrorCode.FILE_STORAGE_FAILED); }
            return result.body();
        } catch (AppException e) { throw e; }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AppException(ErrorCode.FILE_STORAGE_FAILED); }
        catch (Exception e) { throw new AppException(ErrorCode.FILE_STORAGE_FAILED); }
    }
    private String[] cloudKey(String key) {
        String[] parts = key.split(":", 2);
        if (parts.length != 2 || !(parts[0].equals("image") || parts[0].equals("video") || parts[0].equals("raw"))) throw new AppException(ErrorCode.INVALID_FILE_PATH);
        return parts;
    }
    @Override
    public void delete(Stored stored) {
        try {
            if ("local".equals(stored.provider())) Files.deleteIfExists(localPath(stored.key()));
            else { String[] parts = cloudKey(stored.key()); cloudinary.getObject().uploader().destroy(parts[1], ObjectUtils.asMap("resource_type", parts[0], "type", "authenticated", "invalidate", true)); }
        } catch (Exception e) { log.warn("Could not clean up chat attachment {}", stored.key()); }
    }
}
