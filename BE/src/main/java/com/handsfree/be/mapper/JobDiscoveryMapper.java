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
@lombok.RequiredArgsConstructor
public class JobDiscoveryMapper {
    private final com.handsfree.be.repository.ActivityLocationRepository activities;
    private final com.handsfree.be.repository.MatchRatingRepository ratings;
    private final com.handsfree.be.repository.JobMatchRepository matches;

    private com.handsfree.be.dto.response.RatingAggregateResponse hiringReputation(java.util.UUID userId) {
        Object[] row = ratings.aggregateByMode(userId, com.handsfree.be.constant.UserMode.CONSUMER);
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) row = nested;
        Number average = row != null && row.length > 0 && row[0] instanceof Number n ? n : null;
        Number count = row != null && row.length > 1 && row[1] instanceof Number n ? n : null;
        return new com.handsfree.be.dto.response.RatingAggregateResponse(
                average == null ? null : java.math.BigDecimal.valueOf(average.doubleValue()).setScale(2, java.math.RoundingMode.HALF_UP),
                count == null ? 0 : count.longValue(), matches.countSuccessfulConnectionsAsConsumer(userId));
    }
    public JobDiscoveryResponse toResponse(JobPost jobPost, JobInteractionStateResponse interaction) {
        return toResponse(jobPost,interaction,null,null);
    }
    public JobDiscoveryResponse toResponse(JobPost jobPost, JobInteractionStateResponse interaction, Double latitude, Double longitude) {
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
                activities.findById(jobPost.getOwner().getId()).map(com.handsfree.be.entity.ActivityLocation::getArea).orElse("Chưa cập nhật khu vực"),
                jobPost.getOwner().isProfileCompleted(),
                jobPost.getOwner().getProfileTags() == null
                        ? List.of()
                        : jobPost.getOwner().getProfileTags().stream().map(com.handsfree.be.serviceImpl.ContactPrivacy::redact).toList(),
                hiringReputation(jobPost.getOwner().getId())
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
                jobPost.getExpectedEndAt(),
                com.handsfree.be.serviceImpl.LocationPrivacy.area(jobPost),
                jobPost.getBudgetAmount(),
                jobPost.getBudgetType(),
                jobPost.getRequiredWorkers(),
                media,
                interaction,
                jobPost.getPublishedAt(),
                roundedDistance(jobPost,latitude,longitude)
        );
    }

    private Double roundedDistance(JobPost job,Double lat,Double lon) {
        if(lat==null || lon==null || job.getLatitude()==null || job.getLongitude()==null)return null;
        double a=Math.sin(Math.toRadians(lat))*Math.sin(Math.toRadians(job.getLatitude()))
                +Math.cos(Math.toRadians(lat))*Math.cos(Math.toRadians(job.getLatitude()))*Math.cos(Math.toRadians(job.getLongitude()-lon));
        double km=6371.0088*Math.acos(Math.max(-1,Math.min(1,a)));
        return Math.max(0.5,Math.round(km*2)/2.0);
    }
}
