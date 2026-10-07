package com.handsfree.be.serviceImpl;

import com.handsfree.be.entity.WalletTopUp;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.WalletTopUpRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.net.URI;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TopUpService {
    private final WalletService wallet;
    private final WalletTopUpRepository orders;
    private final PayosGateway gateway;

    public WalletTopUp create(UUID owner, BigDecimal amount, UUID requestId) {
        gateway.requireConfigured();
        WalletTopUp order = wallet.prepare(owner, amount, requestId);
        if (order.getCheckoutUrl() != null || order.getCreditedAt() != null) return order;
        JsonNode data;
        try {
            data = gateway.create(order);
        } catch (AppException error) {
            // Recover a link created by payOS if the prior request timed out; never create a new
            // order code on retry.
            JsonNode prior = gateway.lookup(order.getOrderCode());
            check(order, prior);
            String id = prior.path("id").asText();
            if (id.isBlank()) throw error;
            data = prior;
            data = data.deepCopy();
            ((tools.jackson.databind.node.ObjectNode) data)
                    .put("paymentLinkId", id)
                    .put("checkoutUrl", "https://pay.payos.vn/web/" + id);
        }
        check(order, data);
        String link = data.path("paymentLinkId").asText();
        URI url = URI.create(data.path("checkoutUrl").asText());
        if (!"https".equals(url.getScheme())
                || !"pay.payos.vn".equals(url.getHost())
                || link.isBlank()) throw new AppException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        return wallet.attach(order.getOrderCode(), url.toString(), link);
    }

    public WalletTopUp refresh(UUID owner, long code) {
        WalletTopUp order =
                orders.findById(code)
                        .filter(t -> t.getOwnerId().equals(owner))
                        .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_MISMATCH));
        if (order.getCreditedAt() == null) reconcile(order);
        return orders.findById(code).orElseThrow();
    }

    private void check(WalletTopUp order, JsonNode data) {
        if (!data.path("orderCode").canConvertToLong()
                || data.path("orderCode").asLong() != order.getOrderCode()
                || !data.path("amount").isNumber()
                || data.path("amount").decimalValue().compareTo(order.getAmount()) != 0)
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
    }

    private void reconcile(WalletTopUp order) {
        JsonNode data = gateway.lookup(order.getOrderCode());
        check(order, data);
        String state = data.path("status").asText();
        if (!data.path("id").isTextual() || data.path("id").asText().isBlank())
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        if ("PAID".equals(state)
                && (!data.path("amountPaid").isNumber()
                        || data.path("amountPaid").decimalValue().compareTo(order.getAmount()) < 0))
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        wallet.settle(order.getOrderCode(), data.path("id").asText(), order.getAmount(), state);
    }

    public void webhook(JsonNode body) {
        JsonNode data = body.path("data");
        gateway.verify(data, body.path("signature").asText());
        if (!"00".equals(data.path("code").asText())) return;
        if (!"VND".equals(data.path("currency").asText())
                || !data.path("orderCode").canConvertToLong())
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        var order = orders.findById(data.path("orderCode").asLong());
        // payOS webhook registration sends a signed sample not belonging to an application order.
        if (order.isEmpty()) return;
        if (!data.path("paymentLinkId").isTextual()
                || (order.get().getPaymentLinkId() != null
                        && !order.get()
                                .getPaymentLinkId()
                                .equals(data.path("paymentLinkId").asText())))
            throw new AppException(ErrorCode.PAYMENT_MISMATCH);
        // Verify authoritative cumulative payment status; a partial transfer alone cannot credit
        // the wallet.
        reconcile(order.get());
    }
}
