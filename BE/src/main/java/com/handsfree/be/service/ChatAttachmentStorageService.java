package com.handsfree.be.service;
import com.handsfree.be.entity.ChatMessage;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
public interface ChatAttachmentStorageService {
    record Stored(String provider, String key) {}
    Stored store(MultipartFile file);
    InputStream open(ChatMessage message);
    void delete(Stored stored);
}
