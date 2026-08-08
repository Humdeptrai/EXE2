package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.dto.request.JobInterestRequest;
import com.handsfree.be.dto.response.DiscoverySummaryResponse;
import com.handsfree.be.dto.response.JobDiscoveryResponse;
import com.handsfree.be.dto.response.JobInteractionStateResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.service.JobDiscoveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
@Tag(name = "5. Job Discovery", description = "Provider feed, swipe interactions and saved jobs")
@SecurityRequirement(name = "bearerAuth")
public class JobDiscoveryController {
    private final JobDiscoveryService jobDiscoveryService;

    @GetMapping("/feed")
    @Operation(summary = "Get provider discovery feed excluding own, skipped and pending-interest jobs")
    public ResponseEntity<ApiResponse<PageResponse<JobDiscoveryResponse>>> getFeed(
            Authentication authentication,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) BigDecimal minBudget,
            @RequestParam(required = false) BigDecimal maxBudget,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách công việc phù hợp thành công",
                jobDiscoveryService.getFeed(
                        currentUserId(authentication), keyword, categoryId, location,
                        minBudget, maxBudget, page, size
                )
        ));
    }

    @GetMapping("/discovery/{jobId}")
    @Operation(summary = "Get one active discoverable job")
    public ResponseEntity<ApiResponse<JobDiscoveryResponse>> getDetail(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy chi tiết công việc thành công",
                jobDiscoveryService.getDetail(currentUserId(authentication), jobId)
        ));
    }

    @GetMapping("/saved")
    @Operation(summary = "Get current user's saved active jobs")
    public ResponseEntity<ApiResponse<PageResponse<JobDiscoveryResponse>>> getSaved(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách công việc đã lưu thành công",
                jobDiscoveryService.getSaved(currentUserId(authentication), page, size)
        ));
    }

    @GetMapping("/interests")
    @Operation(summary = "Get pending interested or very-interested jobs")
    public ResponseEntity<ApiResponse<PageResponse<JobDiscoveryResponse>>> getInterested(
            Authentication authentication,
            @RequestParam(defaultValue = "INTERESTED") InterestLevel level,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách công việc đã quan tâm thành công",
                jobDiscoveryService.getInterested(currentUserId(authentication), level, page, size)
        ));
    }

    @GetMapping("/skipped")
    @Operation(summary = "Get skipped jobs so the user can restore them")
    public ResponseEntity<ApiResponse<PageResponse<JobDiscoveryResponse>>> getSkipped(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy lịch sử công việc đã bỏ qua thành công",
                jobDiscoveryService.getSkipped(currentUserId(authentication), page, size)
        ));
    }

    @GetMapping("/discovery/summary")
    @Operation(summary = "Get saved, interested, very-interested and skipped counts")
    public ResponseEntity<ApiResponse<DiscoverySummaryResponse>> getSummary(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy tổng quan khám phá thành công",
                jobDiscoveryService.getSummary(currentUserId(authentication))
        ));
    }

    @PostMapping("/{jobId}/save")
    @Operation(summary = "Save a job without applying")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> save(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã lưu công việc",
                jobDiscoveryService.save(currentUserId(authentication), jobId)
        ));
    }

    @DeleteMapping("/{jobId}/save")
    @Operation(summary = "Remove a job from saved list")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> unsave(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã bỏ lưu công việc",
                jobDiscoveryService.unsave(currentUserId(authentication), jobId)
        ));
    }

    @PostMapping("/{jobId}/skip")
    @Operation(summary = "Swipe left: skip and hide a job from feed")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> skip(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã bỏ qua công việc",
                jobDiscoveryService.skip(currentUserId(authentication), jobId)
        ));
    }

    @DeleteMapping("/{jobId}/skip")
    @Operation(summary = "Restore a skipped job to discovery feed")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> restoreSkipped(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã khôi phục công việc vào feed",
                jobDiscoveryService.restoreSkipped(currentUserId(authentication), jobId)
        ));
    }

    @PostMapping("/{jobId}/interest")
    @Operation(summary = "Swipe right or mark a job as very interested")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> expressInterest(
            Authentication authentication,
            @PathVariable UUID jobId,
            @Valid @RequestBody JobInterestRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                request.level() == InterestLevel.VERY_INTERESTED
                        ? "Đã đánh dấu rất quan tâm"
                        : "Đã gửi sự quan tâm đến chủ bài",
                jobDiscoveryService.expressInterest(currentUserId(authentication), jobId, request.level())
        ));
    }

    @DeleteMapping("/{jobId}/interest")
    @Operation(summary = "Withdraw a pending interest request")
    public ResponseEntity<ApiResponse<JobInteractionStateResponse>> withdrawInterest(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã rút sự quan tâm",
                jobDiscoveryService.withdrawInterest(currentUserId(authentication), jobId)
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
