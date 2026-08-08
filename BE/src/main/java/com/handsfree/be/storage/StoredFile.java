package com.handsfree.be.storage;

public record StoredFile(
        String storedName,
        String originalName,
        String contentType,
        long fileSize,
        String publicUrl
) {
}
