package com.handsfree.be.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.payos")
public record PayosProperties(
        boolean enabled,
        String clientId,
        String apiKey,
        String checksumKey,
        String returnUrl,
        String cancelUrl) {}
