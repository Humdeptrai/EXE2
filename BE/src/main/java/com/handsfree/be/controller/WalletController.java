package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.repository.*;
import com.handsfree.be.serviceImpl.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WalletController {
    private final AccountAccess access;
    private final WalletEntryRepository entries;
    private final WalletTopUpRepository orders;
    private final TopUpService topUps;
    private final PlatformSettingsService settings;
    private final PayosGateway gateway;

    public record CreateTopUp(
            @NotNull @DecimalMin("1000") @Digits(integer = 9, fraction = 0) BigDecimal amount,
            @NotNull UUID requestId) {}

    @GetMapping("/wallet")
    public ApiResponse<?> wallet(Authentication a) {
        var u = access.active(UUID.fromString(a.getName()));
        var s = settings.get();
        return ApiResponse.success(
                200,
                "Ví",
                Map.of(
                        "balance",
                        u.getWalletBalance(),
                        "minTopUp",
                        s.getMinTopUp(),
                        "maxTopUp",
                        s.getMaxTopUp(),
                        "topUpEnabled",
                        s.isTopUpEnabled() && gateway.configured()));
    }

    @GetMapping("/wallet/entries")
    public ApiResponse<?> entries(Authentication a, @RequestParam(defaultValue = "0") int page) {
        var u = access.active(UUID.fromString(a.getName()));
        return ApiResponse.success(
                200,
                "Lịch sử ví",
                PageResponse.from(
                        entries.findByOwnerIdOrderByOccurredAtDesc(
                                u.getId(), PageRequest.of(Math.max(0, page), 20))));
    }

    @GetMapping("/wallet/topups")
    public ApiResponse<?> topups(Authentication a, @RequestParam(defaultValue = "0") int page) {
        var u = access.active(UUID.fromString(a.getName()));
        return ApiResponse.success(
                200,
                "Đơn nạp",
                PageResponse.from(
                        orders.findByOwnerIdOrderByCreatedAtDesc(
                                u.getId(), PageRequest.of(Math.max(0, page), 20))));
    }

    @PostMapping("/wallet/topups")
    public ApiResponse<?> create(Authentication a, @Valid @RequestBody CreateTopUp body) {
        return ApiResponse.success(
                200,
                "Đơn nạp",
                topUps.create(
                        access.active(UUID.fromString(a.getName())).getId(),
                        body.amount(),
                        body.requestId()));
    }

    @PostMapping("/wallet/topups/{code}/refresh")
    public ApiResponse<?> refresh(Authentication a, @PathVariable long code) {
        return ApiResponse.success(
                200,
                "Đối soát",
                topUps.refresh(access.active(UUID.fromString(a.getName())).getId(), code));
    }

    @PostMapping("/payments/payos/webhook")
    public Map<String, String> webhook(@RequestBody JsonNode body) {
        topUps.webhook(body);
        return Map.of("code", "00", "desc", "success");
    }
}
