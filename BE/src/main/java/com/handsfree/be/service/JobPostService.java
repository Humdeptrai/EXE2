package com.handsfree.be.service;

import com.handsfree.be.constant.JobListTab;
import com.handsfree.be.dto.request.JobUpsertRequest;
import com.handsfree.be.dto.response.JobManagementSummaryResponse;
import com.handsfree.be.dto.response.JobPostResponse;
import com.handsfree.be.dto.response.PageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface JobPostService {
    JobPostResponse createDraft(UUID userId, JobUpsertRequest request);

    JobPostResponse update(UUID userId, UUID jobId, JobUpsertRequest request);

    JobPostResponse getMineById(UUID userId, UUID jobId);

    PageResponse<JobPostResponse> getMine(UUID userId, JobListTab tab, int page, int size);

    JobManagementSummaryResponse getSummary(UUID userId);

    JobPostResponse publish(UUID userId, UUID jobId);

    JobPostResponse cancel(UUID userId, UUID jobId);

    JobPostResponse repost(UUID userId, UUID jobId);

    List<com.handsfree.be.dto.response.JobMediaResponse> addMedia(UUID userId, UUID jobId, List<MultipartFile> files);

    void deleteMedia(UUID userId, UUID jobId, UUID mediaId);

    void delete(UUID userId, UUID jobId);
}
