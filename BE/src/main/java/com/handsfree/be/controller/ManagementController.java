package com.handsfree.be.controller;

import com.handsfree.be.service.ManagementService;
import com.handsfree.be.service.PlatformSettingsService;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.repository.*;
import com.handsfree.be.serviceImpl.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ManagementController {
    private final AccountAccess access;
    private final ManagementService management;
    private final com.handsfree.be.service.OperatorListService lists;
    private final PlatformSettingsService settings;
    private final ModerationReportRepository reports;
    private final UserRepository users;
    private final com.handsfree.be.mapper.JobPostMapper jobMapper;
    private final JobPostRepository jobs;
    private final JobMatchRepository matches;

    private UUID id(Authentication a) {
        return UUID.fromString(a.getName());
    }



    public record JobAction(boolean hidden, @NotBlank @Size(max = 1000) String reason) {}

    public record UserAction(
            @NotNull UserRole role, boolean active, @NotBlank @Size(max = 1000) String reason) {}

    public record SettingsRequest(
            @NotNull @DecimalMin("1000") @Digits(integer = 8, fraction = 0) BigDecimal consumerFee,
            @NotNull @DecimalMin("1000") @Digits(integer = 8, fraction = 0) BigDecimal providerFee,
            @Min(1000) long minTopUp,
            @Max(100000000) long maxTopUp,
            boolean topUpEnabled,
            @Min(1) @Max(43200) int paymentWindowMinutes,
            @Min(0) @Max(43200) Integer ratingDelayMinutes) {}

    public record RefundRequest(@NotBlank @Size(max = 1000) String reason) {}

    @PatchMapping("/staff/jobs/{id}/visibility")
    public ApiResponse<?> hide(
            Authentication a, @PathVariable UUID id, @Valid @RequestBody JobAction r) {
        management.hideJob(id(a), id, r.hidden(), r.reason());
        return ApiResponse.success(200, "Đã cập nhật", true);
    }

    @GetMapping("/staff/jobs")
    public ApiResponse<?> jobs(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "jobs", page, search, state));
    }

    @GetMapping("/staff/jobs/{jobId}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ApiResponse<?> job(Authentication a, @PathVariable UUID jobId) {
        access.operator(id(a), false);
        var j =
                jobs.findById(jobId)
                        .orElseThrow(
                                () ->
                                        new com.handsfree.be.exception.AppException(
                                                com.handsfree.be.exception.ErrorCode
                                                        .JOB_NOT_FOUND));
        return ApiResponse.success(200, "Nội dung bài đăng", jobMapper.toResponse(j));
    }

    @GetMapping("/staff/dashboard")
    public ApiResponse<?> dashboard(Authentication a) {
        access.operator(id(a), false);
        return ApiResponse.success(
                200,
                "Tổng quan",
                Map.of(
                        "users",
                        users.count(),
                        "jobs",
                        jobs.count(),
                        "matches",
                        matches.count(),
                        "reports",
                        reports.count()));
    }

    @GetMapping("/admin/settings")
    public ApiResponse<?> settings(Authentication a) {
        access.operator(id(a), true);
        return ApiResponse.success(200, "Cấu hình", settings.get());
    }

    @PutMapping("/admin/settings")
    public ApiResponse<?> settings(Authentication a, @Valid @RequestBody SettingsRequest r) {
        return ApiResponse.success(
                200,
                "Đã lưu cấu hình",
                management.changeSettings(
                        id(a),
                        r.consumerFee(),
                        r.providerFee(),
                        r.minTopUp(),
                        r.maxTopUp(),
                        r.topUpEnabled(), r.paymentWindowMinutes(),
                        r.ratingDelayMinutes() == null ? settings.get().getRatingDelayMinutes() : r.ratingDelayMinutes()));
    }

    @GetMapping("/admin/users")
    public ApiResponse<?> users(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "users", page, search, state));
    }

    @PatchMapping("/admin/users/{id}")
    public ApiResponse<?> user(
            Authentication a, @PathVariable UUID id, @Valid @RequestBody UserAction r) {
        management.updateUser(id(a), id, r.role(), r.active(), r.reason());
        return ApiResponse.success(200, "Đã cập nhật", true);
    }

    @GetMapping("/admin/matches")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ApiResponse<?> matches(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "matches", page, search, state));
    }

    @GetMapping("/admin/topups")
    public ApiResponse<?> orders(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "topups", page, search, state));
    }

    @GetMapping("/admin/ledger")
    public ApiResponse<?> ledger(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "ledger", page, search, state));
    }

    @GetMapping("/admin/audit")
    public ApiResponse<?> audit(Authentication a, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue="") String search, @RequestParam(defaultValue="") String state) {
        return ApiResponse.success(200, "Dữ liệu quản trị", lists.list(id(a), "audit", page, search, state));
    }

    @PostMapping("/admin/matches/{matchId}/refund")
    public ApiResponse<?> refund(
            Authentication a, @PathVariable UUID matchId, @Valid @RequestBody RefundRequest r) {
        management.refund(id(a), matchId, r.reason());
        return ApiResponse.success(200, "Đã hoàn phí vào ví", true);
    }
}
