package com.handsfree.be.service;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
public interface ChatAttachmentStorageService {
    record Stored(String provider, String key) {}
    Stored store(MultipartFile file);
    record Source(String provider, String key, String contentType, String originalName, long sizeBytes) {}
    InputStream open(Source file);
    void delete(Stored stored);
}
