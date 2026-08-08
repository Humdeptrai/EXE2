package com.handsfree.be.serviceImpl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.properties.CloudinaryProperties;
import com.handsfree.be.properties.StorageProperties;
import com.handsfree.be.service.MediaStorageService;
import com.handsfree.be.storage.StoredFile;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "cloudinary")
@RequiredArgsConstructor
public class CloudinaryMediaStorageService implements MediaStorageService {
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final StorageProperties storageProperties;

    @Override
    public StoredFile storeJobImage(MultipartFile file) {
        return store(file, "jobs", "job-image");
    }

    @Override
    public StoredFile storeAvatar(MultipartFile file) {
        return store(file, "avatars", "avatar");
    }

    private StoredFile store(MultipartFile file, String folderSuffix, String fallbackName) {
        validate(file);
        if (!cloudinaryProperties.configured()) {
            throw new AppException(ErrorCode.FILE_STORAGE_FAILED);
        }
        String contentType = file.getContentType().toLowerCase(Locale.ROOT);
        String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? fallbackName : file.getOriginalFilename());
        String folder = cloudinaryProperties.normalizedFolder() + "/" + folderSuffix;
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "image",
                    "overwrite", false,
                    "unique_filename", true,
                    "use_filename", false
            ));
            String publicId = String.valueOf(result.get("public_id"));
            String secureUrl = String.valueOf(result.get("secure_url"));
            Object bytes = result.get("bytes");
            long storedBytes = bytes instanceof Number number ? number.longValue() : file.getSize();
            return new StoredFile(publicId, originalName, contentType, storedBytes, secureUrl);
        } catch (IOException exception) {
            throw new AppException(ErrorCode.FILE_STORAGE_FAILED);
        }
    }

    @Override
    public void delete(String storedName) {
        if (!StringUtils.hasText(storedName) || !cloudinaryProperties.configured()) {
            return;
        }
        try {
            cloudinary.uploader().destroy(storedName, ObjectUtils.asMap(
                    "resource_type", "image",
                    "invalidate", true
            ));
        } catch (IOException ignored) {
            // Asset cleanup should not roll back database state when Cloudinary is temporarily unavailable.
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.EMPTY_FILE);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_TYPE);
        }
        if (file.getSize() > storageProperties.maxImageBytes()) {
            throw new AppException(ErrorCode.IMAGE_TOO_LARGE);
        }
    }
}
