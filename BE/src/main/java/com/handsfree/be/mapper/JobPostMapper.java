package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.JobCategoryResponse;
import com.handsfree.be.dto.response.JobMediaResponse;
import com.handsfree.be.dto.response.JobPostResponse;
import com.handsfree.be.entity.JobMedia;
import com.handsfree.be.entity.JobPost;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JobPostMapper {
    public JobPostResponse toResponse(JobPost jobPost) {
        return toResponse(jobPost, 0, 0);
    }

    public JobPostResponse toResponse(JobPost jobPost, int applicantCount, int matchedCount) {
        JobCategoryResponse category = new JobCategoryResponse(
                jobPost.getCategory().getId(),
                jobPost.getCategory().getCode(),
                jobPost.getCategory().getName(),
                jobPost.getCategory().getDescription(),
                jobPost.getCategory().getIcon()
        );
        List<JobMediaResponse> media = jobPost.getMedia() == null
                ? List.of()
                : jobPost.getMedia().stream().map(this::toMediaResponse).toList();

        return new JobPostResponse(
                jobPost.getId(),
                jobPost.getOwner().getId(),
                category,
                jobPost.getTitle(),
                jobPost.getDescription(),
                jobPost.getScheduledDate(),
                jobPost.getStartTime(),
                jobPost.getExpectedEndAt(),
                jobPost.getLocation(),
                jobPost.getBudgetAmount(),
                jobPost.getBudgetType(),
                jobPost.getRequiredWorkers(),
                jobPost.getStatus(),
                applicantCount,
                matchedCount,
                media,
                jobPost.getPublishedAt(),
                jobPost.getCompletedAt(),
                jobPost.getCancelledAt(),
                jobPost.getCreatedAt(),
                jobPost.getUpdatedAt()
        );
    }

    public JobMediaResponse toMediaResponse(JobMedia media) {
        return new JobMediaResponse(
                media.getId(),
                media.getOriginalName(),
                media.getContentType(),
                media.getFileSize(),
                media.getPublicUrl(),
                media.getDisplayOrder()
        );
    }
}
