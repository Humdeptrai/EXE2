package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.properties.StorageProperties;
import com.handsfree.be.service.MediaStorageService;
import com.handsfree.be.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "local", matchIfMissing = true)
@RequiredArgsConstructor
public class LocalMediaStorageService implements MediaStorageService {
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final StorageProperties properties;

    @Override
    public StoredFile storeJobImage(MultipartFile file) {
        return store(file, "job-image");
    }

    @Override
    public StoredFile storeAvatar(MultipartFile file) {
        return store(file, "avatar");
    }

    private StoredFile store(MultipartFile file, String fallbackName) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.EMPTY_FILE);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_TYPE);
        }
        if (file.getSize() > properties.maxImageBytes()) {
            throw new AppException(ErrorCode.IMAGE_TOO_LARGE);
        }

        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? fallbackName : file.getOriginalFilename());
        String extension = switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
        String storedName = UUID.randomUUID() + extension;
        Path directory = Path.of(properties.uploadDir()).toAbsolutePath().normalize();
        Path target = directory.resolve(storedName).normalize();
        if (!target.startsWith(directory)) {
            throw new AppException(ErrorCode.INVALID_FILE_PATH);
        }

        try {
            Files.createDirectories(directory);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new AppException(ErrorCode.FILE_STORAGE_FAILED);
        }

        String baseUrl = properties.publicBaseUrl().endsWith("/")
                ? properties.publicBaseUrl().substring(0, properties.publicBaseUrl().length() - 1)
                : properties.publicBaseUrl();
        return new StoredFile(storedName, originalName, contentType, file.getSize(), baseUrl + "/" + storedName);
    }

    @Override
    public void delete(String storedName) {
        if (!StringUtils.hasText(storedName)) {
            return;
        }
        Path directory = Path.of(properties.uploadDir()).toAbsolutePath().normalize();
        Path target = directory.resolve(storedName).normalize();
        if (!target.startsWith(directory)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // Database cleanup must not fail solely because a local file was already removed.
        }
    }
}
