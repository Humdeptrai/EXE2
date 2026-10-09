package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.PlatformSettingsService;
import com.handsfree.be.service.IdentityService;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.constant.UserMode;
import com.handsfree.be.dto.response.CandidateExpertiseResponse;
import com.handsfree.be.dto.response.CandidateHiringInsightsResponse;
import com.handsfree.be.dto.response.CandidateResponse;
import com.handsfree.be.dto.response.MatchResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.JobInterest;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.JobPost;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.JobMatchingMapper;
import com.handsfree.be.repository.JobInterestRepository;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.repository.JobPostRepository;
import com.handsfree.be.repository.MatchRatingRepository;
import com.handsfree.be.service.JobMatchingService;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import com.handsfree.be.properties.BusinessProperties;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobMatchingServiceImpl implements JobMatchingService {
    private final com.handsfree.be.service.ConnectionPaymentService connectionPaymentService;
    private final BusinessProperties businessProperties;
    private final PlatformSettingsService settings;
    private final IdentityService identity;
    private static final int TOP_EXPERTISE_LIMIT = 3;

    private final JobPostRepository jobPostRepository;
    private final JobInterestRepository jobInterestRepository;
    private final JobMatchRepository jobMatchRepository;
    private final MatchRatingRepository matchRatingRepository;
    private final JobMatchingMapper jobMatchingMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<CandidateResponse> getCandidates(UUID consumerId, UUID jobId, int page, int size) {
        requireOwnedActiveJob(consumerId, jobId);
        Page<JobInterest> interests = jobInterestRepository.findCandidateQueue(
                consumerId,
                jobId,
                InterestStatus.PENDING,
                InterestLevel.VERY_INTERESTED,
                pageRequest(page, size)
        );
        Map<UUID, CandidateHiringInsightsResponse> insightsByProvider = buildHiringInsights(
                interests.getContent().stream().map(interest -> interest.getApplicant().getId()).toList()
        );
        Page<CandidateResponse> result = interests.map(interest -> jobMatchingMapper.toCandidateResponse(
                interest,
                insightsByProvider.getOrDefault(interest.getApplicant().getId(), emptyHiringInsights())
        ));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateResponse getCandidate(UUID consumerId, UUID jobId, UUID interestId) {
        requireOwnedActiveJob(consumerId, jobId);
        JobInterest interest = getCandidateInterest(consumerId, jobId, interestId);
        UUID applicantId = interest.getApplicant().getId();
        CandidateHiringInsightsResponse insights = buildHiringInsights(List.of(applicantId))
                .getOrDefault(applicantId, emptyHiringInsights());
        return jobMatchingMapper.toCandidateResponse(interest, insights);
    }

    @Override
    @Transactional
    public MatchResponse acceptCandidate(UUID consumerId, UUID jobId, UUID interestId) {
        JobPost jobPost = jobPostRepository.findOwnedForMatchingUpdate(consumerId, jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        requireMatchingOpen(jobPost);

        JobInterest interest = getCandidateInterest(consumerId, jobId, interestId);
        if (interest.getStatus() == InterestStatus.ACCEPTED) {
            return jobMatchRepository.findByJobInterest_Id(interestId)
                    .map(jobMatchingMapper::toConsumerMatchResponse)
                    .orElseThrow(() -> new AppException(ErrorCode.DATA_CONFLICT));
        }
        if (interest.getStatus() != InterestStatus.PENDING) {
            throw new AppException(ErrorCode.CANDIDATE_ALREADY_RESPONDED);
        }

        identity.requireVerified(consumerId);
        identity.requireVerified(interest.getApplicant().getId());
        long matchedCount = jobMatchRepository.countByJobPost_IdAndStatus(jobId, MatchStatus.ACTIVE);
        if (matchedCount >= jobPost.getRequiredWorkers()) {
            throw new AppException(ErrorCode.JOB_MATCH_CAPACITY_FULL);
        }

        if (jobPost.getExpectedEndAt() == null || !jobPost.getExpectedEndAt().isAfter(
                java.time.LocalDateTime.of(jobPost.getScheduledDate(), jobPost.getStartTime())))
            throw new AppException(ErrorCode.JOB_END_TIME_INVALID);
        var policy = settings.get();
        Instant expectedEnd = jobPost.getExpectedEndAt().atZone(businessProperties.zoneId()).toInstant();
        Instant ratingOpens = expectedEnd.plusSeconds(policy.getRatingDelayMinutes() * 60L);
        Instant now = Instant.now();
        interest.setStatus(InterestStatus.ACCEPTED);
        interest.setRespondedAt(now);
        jobInterestRepository.save(interest);

        JobMatch match = JobMatch.builder()
                .jobPost(jobPost)
                .consumer(jobPost.getOwner())
                .provider(interest.getApplicant())
                .jobInterest(interest)
                .status(MatchStatus.ACTIVE)
                .matchedAt(now)
                .paymentDeadlineAt(now.plusSeconds(policy.getPaymentWindowMinutes() * 60L))
                .expectedEndAt(expectedEnd)
                .ratingOpensAt(ratingOpens)
                .ratingClosesAt(ratingOpens.plusSeconds(7 * 86400L))
                .build();
        JobMatch saved = jobMatchRepository.saveAndFlush(match);
        connectionPaymentService.getPayment(consumerId, saved.getId());
        notificationService.create(
                interest.getApplicant(),
                NotificationType.CANDIDATE_ACCEPTED,
                "Bạn đã được chấp nhận",
                "Chủ bài đã chấp nhận bạn cho công việc “" + jobPost.getTitle() + "”. Hãy hoàn tất phí kết nối.",
                saved.getId(),
                "/matches/" + saved.getId() + "/payment"
        );
        return jobMatchingMapper.toConsumerMatchResponse(saved);
    }

    @Override
    @Transactional
    public CandidateResponse rejectCandidate(UUID consumerId, UUID jobId, UUID interestId) {
        JobPost jobPost = jobPostRepository.findOwnedForMatchingUpdate(consumerId, jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        requireMatchingOpen(jobPost);
        JobInterest interest = getCandidateInterest(consumerId, jobId, interestId);
        UUID applicantId = interest.getApplicant().getId();
        CandidateHiringInsightsResponse insights = buildHiringInsights(List.of(applicantId))
                .getOrDefault(applicantId, emptyHiringInsights());
        if (interest.getStatus() == InterestStatus.REJECTED) {
            return jobMatchingMapper.toCandidateResponse(interest, insights);
        }
        if (interest.getStatus() != InterestStatus.PENDING) {
            throw new AppException(ErrorCode.CANDIDATE_ALREADY_RESPONDED);
        }
        interest.setStatus(InterestStatus.REJECTED);
        interest.setRespondedAt(Instant.now());
        JobInterest saved = jobInterestRepository.save(interest);
        notificationService.create(
                interest.getApplicant(),
                NotificationType.CANDIDATE_REJECTED,
                "Kết quả ứng tuyển",
                "Bạn chưa được chọn cho công việc “" + interest.getJobPost().getTitle() + "”.",
                interest.getJobPost().getId(),
                "/discover"
        );
        return jobMatchingMapper.toCandidateResponse(saved, insights);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MatchResponse> getProviderMatches(UUID providerId, int page, int size) {
        Page<MatchResponse> result = jobMatchRepository
                .findAllByProvider_IdAndStatusInOrderByMatchedAtDesc(
                        providerId,
                        List.of(MatchStatus.ACTIVE, MatchStatus.COMPLETED, MatchStatus.EXPIRED, MatchStatus.DISCONNECTED),
                        pageRequest(page, size)
                )
                .map(jobMatchingMapper::toProviderMatchResponse);
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<MatchResponse> getConsumerMatches(UUID consumerId, int page, int size) {
        Page<MatchResponse> result = jobMatchRepository
                .findAllByConsumer_IdAndStatusInOrderByMatchedAtDesc(
                        consumerId,
                        List.of(MatchStatus.ACTIVE, MatchStatus.COMPLETED, MatchStatus.EXPIRED, MatchStatus.DISCONNECTED),
                        pageRequest(page, size)
                )
                .map(jobMatchingMapper::toConsumerMatchResponse);
        return PageResponse.from(result);
    }

    private Map<UUID, CandidateHiringInsightsResponse> buildHiringInsights(Collection<UUID> providerIds) {
        Set<UUID> distinctProviderIds = new LinkedHashSet<>(providerIds);
        if (distinctProviderIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, RatingSummary> ratings = new HashMap<>();
        for (Object[] row : matchRatingRepository.aggregateByModeForUsers(distinctProviderIds, UserMode.PROVIDER)) {
            UUID providerId = (UUID) row[0];
            Number average = row[1] instanceof Number number ? number : null;
            Number count = row[2] instanceof Number number ? number : null;
            ratings.put(providerId, new RatingSummary(
                    average == null ? null : BigDecimal.valueOf(average.doubleValue()).setScale(2, RoundingMode.HALF_UP),
                    count == null ? 0L : count.longValue()
            ));
        }

        Map<UUID, List<CandidateExpertiseResponse>> expertiseByProvider = new HashMap<>();
        for (Object[] row : jobMatchRepository.summarizeSuccessfulExpertise(distinctProviderIds)) {
            UUID providerId = (UUID) row[0];
            Number count = row[5] instanceof Number number ? number : null;
            CandidateExpertiseResponse expertise = new CandidateExpertiseResponse(
                    (UUID) row[1],
                    (String) row[2],
                    (String) row[3],
                    (String) row[4],
                    count == null ? 0L : count.longValue()
            );
            expertiseByProvider.computeIfAbsent(providerId, ignored -> new ArrayList<>()).add(expertise);
        }

        Map<UUID, CandidateHiringInsightsResponse> result = new HashMap<>();
        for (UUID providerId : distinctProviderIds) {
            List<CandidateExpertiseResponse> expertise = new ArrayList<>(
                    expertiseByProvider.getOrDefault(providerId, List.of())
            );
            expertise.sort(Comparator
                    .comparingLong(CandidateExpertiseResponse::successfulMatchCount).reversed()
                    .thenComparing(CandidateExpertiseResponse::name, String.CASE_INSENSITIVE_ORDER));

            long successfulMatchCount = expertise.stream()
                    .mapToLong(CandidateExpertiseResponse::successfulMatchCount)
                    .sum();
            List<CandidateExpertiseResponse> topExpertise = expertise.stream()
                    .limit(TOP_EXPERTISE_LIMIT)
                    .toList();
            RatingSummary rating = ratings.getOrDefault(providerId, RatingSummary.EMPTY);

            result.put(providerId, new CandidateHiringInsightsResponse(
                    rating.averageRating(),
                    rating.ratingCount(),
                    successfulMatchCount,
                    topExpertise
            ));
        }
        return result;
    }

    private CandidateHiringInsightsResponse emptyHiringInsights() {
        return new CandidateHiringInsightsResponse(null, 0, 0, List.of());
    }

    private JobPost requireOwnedActiveJob(UUID consumerId, UUID jobId) {
        JobPost jobPost = jobPostRepository.findByIdAndOwner_Id(jobId, consumerId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        requireMatchingOpen(jobPost);
        return jobPost;
    }

    private void requireMatchingOpen(JobPost jobPost) {
        if (jobPost.isModerationHidden() || jobPost.getStatus() != JobStatus.PUBLISHED || jobPost.getScheduledDate().isBefore(LocalDate.now(businessProperties.zoneId()))) {
            throw new AppException(ErrorCode.JOB_MATCHING_NOT_AVAILABLE);
        }
    }

    private JobInterest getCandidateInterest(UUID consumerId, UUID jobId, UUID interestId) {
        return jobInterestRepository.findByIdAndJobPost_IdAndJobPost_Owner_Id(interestId, jobId, consumerId)
                .orElseThrow(() -> new AppException(ErrorCode.CANDIDATE_NOT_FOUND));
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 50)
        );
    }

    private record RatingSummary(BigDecimal averageRating, long ratingCount) {
        private static final RatingSummary EMPTY = new RatingSummary(null, 0);
    }
}
