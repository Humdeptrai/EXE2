package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.response.CandidateResponse;
import com.handsfree.be.dto.response.MatchResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.service.JobMatchingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "6. Matching", description = "Consumer candidate review and accepted matching")
public class JobMatchingController {
    private final JobMatchingService jobMatchingService;

    @GetMapping("/jobs/{jobId}/candidates")
    @Operation(summary = "Get pending candidates with Provider reputation and top successful expertise")
    public ResponseEntity<ApiResponse<PageResponse<CandidateResponse>>> getCandidates(
            Authentication authentication,
            @PathVariable UUID jobId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách ứng viên thành công",
                jobMatchingService.getCandidates(currentUserId(authentication), jobId, page, size)
        ));
    }

    @GetMapping("/jobs/{jobId}/candidates/{interestId}")
    @Operation(summary = "Get one candidate profile preview with hiring reputation and expertise")
    public ResponseEntity<ApiResponse<CandidateResponse>> getCandidate(
            Authentication authentication,
            @PathVariable UUID jobId,
            @PathVariable UUID interestId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy hồ sơ ứng viên thành công",
                jobMatchingService.getCandidate(currentUserId(authentication), jobId, interestId)
        ));
    }

    @PostMapping("/jobs/{jobId}/candidates/{interestId}/accept")
    @Operation(summary = "Swipe right: accept a candidate and create an active match")
    public ResponseEntity<ApiResponse<MatchResponse>> acceptCandidate(
            Authentication authentication,
            @PathVariable UUID jobId,
            @PathVariable UUID interestId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã chấp nhận ứng viên và tạo matching",
                jobMatchingService.acceptCandidate(currentUserId(authentication), jobId, interestId)
        ));
    }

    @PostMapping("/jobs/{jobId}/candidates/{interestId}/reject")
    @Operation(summary = "Swipe left: reject a pending candidate")
    public ResponseEntity<ApiResponse<CandidateResponse>> rejectCandidate(
            Authentication authentication,
            @PathVariable UUID jobId,
            @PathVariable UUID interestId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã từ chối ứng viên",
                jobMatchingService.rejectCandidate(currentUserId(authentication), jobId, interestId)
        ));
    }

    @GetMapping("/matches/provider")
    @Operation(summary = "Get active matches where current user is the provider")
    public ResponseEntity<ApiResponse<PageResponse<MatchResponse>>> getProviderMatches(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách matching của người nhận việc thành công",
                jobMatchingService.getProviderMatches(currentUserId(authentication), page, size)
        ));
    }

    @GetMapping("/matches/consumer")
    @Operation(summary = "Get active matches where current user is the consumer")
    public ResponseEntity<ApiResponse<PageResponse<MatchResponse>>> getConsumerMatches(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách matching của người thuê việc thành công",
                jobMatchingService.getConsumerMatches(currentUserId(authentication), page, size)
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
