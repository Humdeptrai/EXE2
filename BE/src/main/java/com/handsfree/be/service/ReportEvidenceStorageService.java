package com.handsfree.be.service;
import com.handsfree.be.entity.ReportEvidence;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;
public interface ReportEvidenceStorageService {
    record Stored(String provider, String key) {}
    Stored store(MultipartFile file);
    InputStream open(ReportEvidence evidence);
    void delete(Stored stored);
}
