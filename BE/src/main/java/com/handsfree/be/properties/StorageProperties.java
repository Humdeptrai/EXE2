package com.handsfree.be.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        String provider,
        String uploadDir,
        String publicBaseUrl,
        long maxImageBytes
) {
}
