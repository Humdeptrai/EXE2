package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.JobCategoryResponse;
import com.handsfree.be.dto.response.JobDiscoveryResponse;
import com.handsfree.be.dto.response.JobInteractionStateResponse;
import com.handsfree.be.dto.response.JobMediaResponse;
import com.handsfree.be.dto.response.JobOwnerSummaryResponse;
import com.handsfree.be.entity.JobPost;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JobDiscoveryMapper {
    public JobDiscoveryResponse toResponse(JobPost jobPost, JobInteractionStateResponse interaction) {
        JobCategoryResponse category = new JobCategoryResponse(
                jobPost.getCategory().getId(),
                jobPost.getCategory().getCode(),
                jobPost.getCategory().getName(),
                jobPost.getCategory().getDescription(),
                jobPost.getCategory().getIcon()
        );

        JobOwnerSummaryResponse owner = new JobOwnerSummaryResponse(
                jobPost.getOwner().getId(),
                "Người thuê HandsFree",
                null,
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(jobPost.getOwner().getLocation()),
                jobPost.getOwner().isProfileCompleted(),
                jobPost.getOwner().getProfileTags() == null
                        ? List.of()
                        : jobPost.getOwner().getProfileTags().stream().map(com.handsfree.be.serviceImpl.ContactPrivacy::redact).toList()
        );

        List<JobMediaResponse> media = jobPost.getMedia() == null
                ? List.of()
                : jobPost.getMedia().stream()
                .map(item -> new JobMediaResponse(
                        item.getId(),
                        com.handsfree.be.serviceImpl.ContactPrivacy.redact(item.getOriginalName()),
                        item.getContentType(),
                        item.getFileSize(),
                        item.getPublicUrl(),
                        item.getDisplayOrder()
                ))
                .toList();

        return new JobDiscoveryResponse(
                jobPost.getId(),
                owner,
                category,
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(jobPost.getTitle()),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(jobPost.getDescription()),
                jobPost.getScheduledDate(),
                jobPost.getStartTime(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(jobPost.getLocation()),
                jobPost.getBudgetAmount(),
                jobPost.getBudgetType(),
                jobPost.getRequiredWorkers(),
                media,
                interaction,
                jobPost.getPublishedAt()
        );
    }
}
