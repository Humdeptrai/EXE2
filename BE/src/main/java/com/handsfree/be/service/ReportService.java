package com.handsfree.be.service;
import com.handsfree.be.dto.request.ReportRequest;
import com.handsfree.be.dto.request.ReportResolutionRequest;
import com.handsfree.be.dto.response.ReportResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.storage.PrivateReportFile;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.UUID;
public interface ReportService {
    ReportResponse create(UUID actor, ReportRequest request, List<MultipartFile> files);
    PageResponse<ReportResponse> mine(UUID actor, int page);
    PageResponse<ReportResponse> list(UUID actor, int page);
    PageResponse<ReportResponse> list(UUID actor, int page, String search, String state);
    ReportResponse detail(UUID actor, UUID reportId);
    ReportResponse claim(UUID actor, UUID reportId);
    ReportResponse release(UUID actor, UUID reportId);
    ReportResponse resolve(UUID actor, UUID reportId, ReportResolutionRequest request);
    PrivateReportFile openEvidence(UUID actor, UUID reportId, UUID evidenceId);
}
