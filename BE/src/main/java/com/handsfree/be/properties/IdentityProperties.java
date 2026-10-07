package com.handsfree.be.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter @Setter
@ConfigurationProperties(prefix = "app.identity")
public class IdentityProperties {
    private boolean enabled = false;
    private String apiKey = "";
    private String encryptionKey = "";
    private String ocrUrl = "https://api.fpt.ai/vision/idr/vnm/";
    private String livenessUrl = "https://api.fpt.ai/dmp/liveness/v3";
    private String faceMatchUrl = "https://api.fpt.ai/dmp/checkface/v1/";
    private double minSimilarity = 80;
}
