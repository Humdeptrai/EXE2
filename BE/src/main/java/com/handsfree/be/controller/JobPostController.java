package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.constant.JobListTab;
import com.handsfree.be.dto.request.JobUpsertRequest;
import com.handsfree.be.dto.response.JobManagementSummaryResponse;
import com.handsfree.be.dto.response.JobMediaResponse;
import com.handsfree.be.dto.response.JobPostResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.service.JobPostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
@Tag(name = "4. Job Post", description = "Consumer job posting and management APIs")
@SecurityRequirement(name = "bearerAuth")
public class JobPostController {
    private final JobPostService jobPostService;

    @PostMapping
    @Operation(summary = "Create a complete job post as draft")
    public ResponseEntity<ApiResponse<JobPostResponse>> createDraft(
            Authentication authentication,
            @Valid @RequestBody JobUpsertRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                201,
                "Lưu bản nháp thành công",
                jobPostService.createDraft(currentUserId(authentication), request)
        ));
    }

    @GetMapping("/mine")
    @Operation(summary = "Get current user's managed job posts")
    public ResponseEntity<ApiResponse<PageResponse<JobPostResponse>>> getMine(
            Authentication authentication,
            @RequestParam(defaultValue = "ACTIVE") JobListTab tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách bài đăng thành công",
                jobPostService.getMine(currentUserId(authentication), tab, page, size)
        ));
    }

    @GetMapping("/mine/summary")
    @Operation(summary = "Get current user's job-management counts")
    public ResponseEntity<ApiResponse<JobManagementSummaryResponse>> getSummary(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy tổng quan bài đăng thành công",
                jobPostService.getSummary(currentUserId(authentication))
        ));
    }

    @GetMapping("/{jobId}")
    @Operation(summary = "Get one owned job post")
    public ResponseEntity<ApiResponse<JobPostResponse>> getMineById(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy chi tiết bài đăng thành công",
                jobPostService.getMineById(currentUserId(authentication), jobId)
        ));
    }

    @PatchMapping("/{jobId}")
    @Operation(summary = "Update an owned draft or active job post")
    public ResponseEntity<ApiResponse<JobPostResponse>> update(
            Authentication authentication,
            @PathVariable UUID jobId,
            @Valid @RequestBody JobUpsertRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Cập nhật bài đăng thành công",
                jobPostService.update(currentUserId(authentication), jobId, request)
        ));
    }

    @PostMapping("/{jobId}/publish")
    @Operation(summary = "Publish an owned draft")
    public ResponseEntity<ApiResponse<JobPostResponse>> publish(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đăng bài thành công",
                jobPostService.publish(currentUserId(authentication), jobId)
        ));
    }

    @PostMapping("/{jobId}/cancel")
    @Operation(summary = "Close an active job post")
    public ResponseEntity<ApiResponse<JobPostResponse>> cancel(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã kết thúc bài đăng",
                jobPostService.cancel(currentUserId(authentication), jobId)
        ));
    }

    @PostMapping("/{jobId}/repost")
    @Operation(summary = "Clone a completed or cancelled post into a new draft")
    public ResponseEntity<ApiResponse<JobPostResponse>> repost(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                201,
                "Đã tạo bản nháp mới từ bài đăng cũ",
                jobPostService.repost(currentUserId(authentication), jobId)
        ));
    }

    @PostMapping(value = "/{jobId}/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload up to five images for a job post")
    public ResponseEntity<ApiResponse<List<JobMediaResponse>>> addMedia(
            Authentication authentication,
            @PathVariable UUID jobId,
            @Parameter(description = "JPEG, PNG or WEBP images; maximum five images in total")
            @RequestPart("files") List<MultipartFile> files
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                201,
                "Tải hình ảnh lên thành công",
                jobPostService.addMedia(currentUserId(authentication), jobId, files)
        ));
    }

    @DeleteMapping("/{jobId}/media/{mediaId}")
    @Operation(summary = "Delete one image from an owned job post")
    public ResponseEntity<ApiResponse<Void>> deleteMedia(
            Authentication authentication,
            @PathVariable UUID jobId,
            @PathVariable UUID mediaId
    ) {
        jobPostService.deleteMedia(currentUserId(authentication), jobId, mediaId);
        return ResponseEntity.ok(ApiResponse.success(200, "Xóa hình ảnh thành công", null));
    }

    @DeleteMapping("/{jobId}")
    @Operation(summary = "Delete an owned draft or cancelled post")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication,
            @PathVariable UUID jobId
    ) {
        jobPostService.delete(currentUserId(authentication), jobId);
        return ResponseEntity.ok(ApiResponse.success(200, "Xóa bài đăng thành công", null));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
