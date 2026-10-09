package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.*;
import com.handsfree.be.dto.response.*;
import com.handsfree.be.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;
    private UUID actor(Authentication a) { return UUID.fromString(a.getName()); }
    @PostMapping(value = "/reports", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ReportResponse> create(Authentication a, @Valid @RequestBody ReportRequest request) {
        return ApiResponse.success(200, "Đã gửi báo cáo", reportService.create(actor(a), request, List.of()));
    }
    @PostMapping(value = "/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReportResponse> upload(Authentication a, @Valid @RequestPart("report") ReportRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.success(200, "Đã gửi báo cáo", reportService.create(actor(a), request, files));
    }
    @GetMapping("/reports/mine")
    public ApiResponse<PageResponse<ReportResponse>> mine(Authentication a, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(200, "Báo cáo của bạn", reportService.mine(actor(a), page));
    }
    @GetMapping("/reports/{id}")
    public ApiResponse<ReportResponse> detail(Authentication a, @PathVariable UUID id) {
        return ApiResponse.success(200, "Chi tiết báo cáo", reportService.detail(actor(a), id));
    }
    @GetMapping("/staff/reports")
    public ApiResponse<PageResponse<ReportResponse>> list(Authentication a, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(200, "Báo cáo", reportService.list(actor(a), page));
    }
    @PostMapping("/staff/reports/{id}/claim")
    public ApiResponse<ReportResponse> claim(Authentication a, @PathVariable UUID id) {
        return ApiResponse.success(200, "Đã nhận xử lý báo cáo", reportService.claim(actor(a), id));
    }
    @PostMapping("/staff/reports/{id}/release")
    public ApiResponse<ReportResponse> release(Authentication a, @PathVariable UUID id) {
        return ApiResponse.success(200, "Đã trả báo cáo về trạng thái mới", reportService.release(actor(a), id));
    }
    @PatchMapping("/staff/reports/{id}")
    public ApiResponse<ReportResponse> resolve(Authentication a, @PathVariable UUID id, @Valid @RequestBody ReportResolutionRequest request) {
        return ApiResponse.success(200, "Đã xử lý và thông báo cho người gửi", reportService.resolve(actor(a), id, request));
    }
    @GetMapping("/reports/{id}/evidence/{evidenceId}")
    public ResponseEntity<StreamingResponseBody> evidence(Authentication a, @PathVariable UUID id, @PathVariable UUID evidenceId) {
        var file = reportService.openEvidence(actor(a), id, evidenceId);
        StreamingResponseBody body = output -> { try (var in = file.stream()) { in.transferTo(output); } };
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType())).contentLength(file.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename(file.originalName(), StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff").body(body);
    }
}
