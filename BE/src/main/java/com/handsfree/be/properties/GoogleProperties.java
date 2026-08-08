package com.handsfree.be.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;

@ConfigurationProperties(prefix = "app.google")
public record GoogleProperties(String clientIds) {
    public List<String> allowedClientIds() {
        if (!StringUtils.hasText(clientIds)) {
            return List.of();
        }
        return Arrays.stream(StringUtils.commaDelimitedListToStringArray(clientIds))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }
}
