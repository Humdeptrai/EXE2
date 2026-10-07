package com.handsfree.be.serviceImpl;

import com.handsfree.be.entity.WalletTopUp;
import com.handsfree.be.exception.*;
import com.handsfree.be.properties.PayosProperties;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Service
@RequiredArgsConstructor
public class PayosGateway {
    private final PayosProperties properties;
    private final ObjectMapper json;
    private final HttpClient http =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();

    public boolean configured() {
        return properties.enabled()
                && text(properties.clientId())
                && text(properties.apiKey())
                && text(properties.checksumKey())
                && text(properties.returnUrl())
                && text(properties.cancelUrl());
    }

    private boolean text(String v) {
        return v != null && !v.isBlank();
    }

    public void requireConfigured() {
        if (!configured()) throw new AppException(ErrorCode.PAYMENT_NOT_CONFIGURED);
    }

    public String sign(Map<String, ?> values) {
        try {
            StringJoiner joined = new StringJoiner("&");
            new TreeMap<>(values)
                    .forEach(
                            (k, v) ->
                                    joined.add(
                                            k
                                                    + "="
                                                    + (v == null
                                                                    || "null".equals(v)
                                                                    || "undefined".equals(v)
                                                            ? ""
                                                            : String.valueOf(v))));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(
                    new SecretKeySpec(
                            properties.checksumKey().getBytes(StandardCharsets.UTF_8),
                            "HmacSHA256"));
            return HexFormat.of()
                    .formatHex(mac.doFinal(joined.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new AppException(ErrorCode.PAYMENT_SIGNATURE_INVALID);
        }
    }

    public void verify(JsonNode data, String signature) {
        requireConfigured();
        if (data == null || !data.isObject())
            throw new AppException(ErrorCode.PAYMENT_SIGNATURE_INVALID);
        Map<String, Object> fields = new TreeMap<>();
        for (var entry : data.properties()) {
            JsonNode value = entry.getValue();
            if ((value.isObject() || value.isArray()))
                throw new AppException(ErrorCode.PAYMENT_SIGNATURE_INVALID);
            fields.put(entry.getKey(), value.isNull() ? "" : value.asText());
        }
        if (signature == null
                || !signature.matches("[0-9a-fA-F]{64}")
                || !MessageDigest.isEqual(
                        sign(fields).getBytes(StandardCharsets.US_ASCII),
                        signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))
            throw new AppException(ErrorCode.PAYMENT_SIGNATURE_INVALID);
    }

    public JsonNode create(WalletTopUp order) {
        Map<String, Object> signed = new TreeMap<>();
        signed.put("amount", order.getAmount().longValueExact());
        signed.put("orderCode", order.getOrderCode());
        signed.put("description", "HF" + order.getOrderCode());
        signed.put("returnUrl", properties.returnUrl());
        signed.put("cancelUrl", properties.cancelUrl());
        Map<String, Object> body = new LinkedHashMap<>(signed);
        body.put("signature", sign(signed));
        JsonNode result = request("POST", "/v2/payment-requests", body);
        verify(result.path("data"), result.path("signature").asText());
        return result.path("data");
    }

    public JsonNode lookup(long orderCode) {
        return request("GET", "/v2/payment-requests/" + orderCode, null).path("data");
    }

    private JsonNode request(String method, String path, Object body) {
        requireConfigured();
        try {
            HttpRequest.Builder b =
                    HttpRequest.newBuilder(URI.create("https://api-merchant.payos.vn" + path))
                            .timeout(Duration.ofSeconds(20))
                            .header("x-client-id", properties.clientId())
                            .header("x-api-key", properties.apiKey())
                            .header("Content-Type", "application/json");
            if (body == null) b.GET();
            else b.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
            HttpResponse<String> response =
                    http.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200)
                throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
            JsonNode result = json.readTree(response.body());
            if (!"00".equals(result.path("code").asText()))
                throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
            return result;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }
    }
}
