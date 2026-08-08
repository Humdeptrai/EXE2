package com.handsfree.be.mapper;

import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.dto.response.CandidateHiringInsightsResponse;
import com.handsfree.be.dto.response.CandidateResponse;
import com.handsfree.be.dto.response.JobCategoryResponse;
import com.handsfree.be.dto.response.MatchResponse;
import com.handsfree.be.dto.response.MatchUserResponse;
import com.handsfree.be.entity.JobInterest;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JobMatchingMapper {
    public CandidateResponse toCandidateResponse(JobInterest interest, CandidateHiringInsightsResponse hiringInsights) {
        User applicant = interest.getApplicant();
        boolean identityRevealed = interest.getStatus() == InterestStatus.ACCEPTED;
        return new CandidateResponse(
                interest.getId(),
                interest.getJobPost().getId(),
                applicant.getId(),
                identityRevealed ? applicant.getFullName() : "Người dùng Hands-free",
                identityRevealed ? applicant.getAvatarUrl() : null,
                applicant.getLocation(),
                applicant.getBio(),
                applicant.getProfileTags() == null ? List.of() : List.copyOf(applicant.getProfileTags()),
                applicant.isProfileCompleted(),
                identityRevealed,
                interest.getLevel(),
                interest.getStatus(),
                interest.getCreatedAt(),
                interest.getRespondedAt(),
                hiringInsights
        );
    }

    public MatchResponse toProviderMatchResponse(JobMatch match) {
        return toMatchResponse(match, match.getConsumer());
    }

    public MatchResponse toConsumerMatchResponse(JobMatch match) {
        return toMatchResponse(match, match.getProvider());
    }

    private MatchResponse toMatchResponse(JobMatch match, User counterpart) {
        JobCategoryResponse category = new JobCategoryResponse(
                match.getJobPost().getCategory().getId(),
                match.getJobPost().getCategory().getCode(),
                match.getJobPost().getCategory().getName(),
                match.getJobPost().getCategory().getDescription(),
                match.getJobPost().getCategory().getIcon()
        );
        MatchUserResponse user = new MatchUserResponse(
                counterpart.getId(),
                counterpart.getFullName(),
                counterpart.getAvatarUrl(),
                counterpart.getLocation(),
                counterpart.getBio(),
                counterpart.getProfileTags() == null ? List.of() : List.copyOf(counterpart.getProfileTags()),
                counterpart.isProfileCompleted()
        );
        return new MatchResponse(
                match.getId(),
                match.getJobPost().getId(),
                match.getJobPost().getTitle(),
                category,
                match.getJobPost().getScheduledDate(),
                match.getJobPost().getStartTime(),
                match.getJobPost().getLocation(),
                match.getJobPost().getBudgetAmount(),
                match.getJobPost().getBudgetType(),
                match.getJobPost().getRequiredWorkers(),
                match.getStatus(),
                user,
                match.getMatchedAt(),
                match.getConnectionSucceededAt(),
                match.getConnectionSucceededAt() != null,
                match.getConnectionSucceededAt() != null && match.getChatUnlockedAt() != null
        );
    }
}
