package com.handsfree.be.dto.response;

import java.util.UUID;

public record JobMediaResponse(
        UUID id,
        String originalName,
        String contentType,
        long fileSize,
        String url,
        int displayOrder
) {
}
