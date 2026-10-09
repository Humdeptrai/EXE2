package com.handsfree.be.mapper;

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
@lombok.RequiredArgsConstructor
public class JobMatchingMapper {
    private final com.handsfree.be.serviceImpl.ContactAccess contactAccess;
    private final com.handsfree.be.repository.JobMatchRepository matches;
    private final com.handsfree.be.repository.ConnectionPaymentRepository payments;
    public CandidateResponse toCandidateResponse(JobInterest interest, CandidateHiringInsightsResponse hiringInsights) {
        User applicant = interest.getApplicant();
        var matched = matches.findByJobInterest_Id(interest.getId());
        boolean identityRevealed = matched.map(contactAccess::unlocked).orElse(false);
        String name = identityRevealed ? contactAccess.user(applicant, matched.orElseThrow()).fullName() : "Người dùng Hands-free";
        return new CandidateResponse(
                interest.getId(),
                interest.getJobPost().getId(),
                applicant.getId(),
                name,
                identityRevealed ? applicant.getAvatarUrl() : null,
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(applicant.getLocation()),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(applicant.getBio()),
                applicant.getProfileTags() == null ? List.of() : applicant.getProfileTags().stream().map(com.handsfree.be.serviceImpl.ContactPrivacy::redact).toList(),
                applicant.isProfileCompleted(),
                identityRevealed,
                interest.getLevel(),
                interest.getStatus(),
                interest.getCreatedAt(),
                interest.getRespondedAt(),
                hiringInsights,
                matched.map(JobMatch::getId).orElse(null)
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
        var payment = payments.findByJobMatch_Id(match.getId()).orElse(null);
        MatchUserResponse user = contactAccess.user(counterpart, match);
        return new MatchResponse(
                match.getId(),
                match.getJobPost().getId(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(match.getJobPost().getTitle()),
                category,
                match.getJobPost().getScheduledDate(),
                match.getJobPost().getStartTime(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(match.getJobPost().getLocation()),
                match.getJobPost().getBudgetAmount(),
                match.getJobPost().getBudgetType(),
                match.getJobPost().getRequiredWorkers(),
                match.getStatus(),
                user,
                match.getMatchedAt(),
                match.getConnectionSucceededAt(),
                contactAccess.unlocked(match),
                contactAccess.unlocked(match) && match.getChatUnlockedAt() != null,
                payment != null && payment.getConsumerPaymentStatus() == com.handsfree.be.constant.PaymentStatus.PAID,
                payment != null && payment.getProviderPaymentStatus() == com.handsfree.be.constant.PaymentStatus.PAID,
                match.getExpectedEndAt(), match.getRatingOpensAt(), match.getRatingClosesAt()
        );
    }
}
