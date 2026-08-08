package com.handsfree.be.service;

import com.handsfree.be.storage.StoredFile;
import org.springframework.web.multipart.MultipartFile;

public interface MediaStorageService {
    StoredFile storeJobImage(MultipartFile file);

    StoredFile storeAvatar(MultipartFile file);

    void delete(String storedName);
}
