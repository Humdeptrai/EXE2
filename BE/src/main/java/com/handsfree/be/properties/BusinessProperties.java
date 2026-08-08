package com.handsfree.be.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.ZoneId;

@ConfigurationProperties(prefix = "app.business")
public record BusinessProperties(String timeZone) {
    public ZoneId zoneId() {
        return ZoneId.of(timeZone == null || timeZone.isBlank() ? "Asia/Ho_Chi_Minh" : timeZone);
    }
}
