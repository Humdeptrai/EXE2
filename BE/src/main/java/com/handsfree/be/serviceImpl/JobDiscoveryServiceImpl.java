package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.IdentityService;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.response.DiscoverySummaryResponse;
import com.handsfree.be.dto.response.JobDiscoveryResponse;
import com.handsfree.be.dto.response.JobInteractionStateResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.JobInterest;
import com.handsfree.be.entity.JobPost;
import com.handsfree.be.entity.SavedJob;
import com.handsfree.be.entity.SkippedJob;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.JobDiscoveryMapper;
import com.handsfree.be.repository.JobInterestRepository;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.repository.JobPostRepository;
import com.handsfree.be.repository.SavedJobRepository;
import com.handsfree.be.repository.SkippedJobRepository;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.service.JobDiscoveryService;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import com.handsfree.be.properties.BusinessProperties;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobDiscoveryServiceImpl implements JobDiscoveryService {
    private final BusinessProperties businessProperties;
    private final IdentityService identity;
    private static final List<InterestStatus> HIDDEN_FROM_FEED = List.of(
            InterestStatus.PENDING,
            InterestStatus.ACCEPTED,
            InterestStatus.REJECTED
    );

    private final JobPostRepository jobPostRepository;
    private final SavedJobRepository savedJobRepository;
    private final SkippedJobRepository skippedJobRepository;
    private final JobInterestRepository jobInterestRepository;
    private final JobMatchRepository jobMatchRepository;
    private final UserRepository userRepository;
    private final JobDiscoveryMapper jobDiscoveryMapper;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobDiscoveryResponse> getFeed(
            UUID userId,
            String keyword,
            UUID categoryId,
            String location,
            BigDecimal minBudget,
            BigDecimal maxBudget,
            int page,
            int size
    ) {
        validateBudgetRange(minBudget, maxBudget);
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(Math.max(size, 1), 20);
        Page<JobDiscoveryResponse> result = jobPostRepository.findDiscoveryFeed(
                        userId,
                        JobStatus.PUBLISHED,
                        LocalDate.now(businessProperties.zoneId()),
                        categoryId,
                        normalize(keyword),
                        normalize(location),
                        minBudget,
                        maxBudget,
                        HIDDEN_FROM_FEED,
                        MatchStatus.ACTIVE,
                        PageRequest.of(normalizedPage, normalizedSize, Sort.by(
                                Sort.Order.desc("publishedAt"),
                                Sort.Order.desc("createdAt")
                        ))
                )
                .map(jobPost -> jobDiscoveryMapper.toResponse(jobPost, getState(userId, jobPost.getId())));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public JobDiscoveryResponse getDetail(UUID userId, UUID jobId) {
        JobPost jobPost = getDiscoverableJob(userId, jobId);
        return jobDiscoveryMapper.toResponse(jobPost, getState(userId, jobId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobDiscoveryResponse> getSaved(UUID userId, int page, int size) {
        Page<JobDiscoveryResponse> result = savedJobRepository
                .findAllByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqualOrderByCreatedAtDesc(
                        userId,
                        JobStatus.PUBLISHED,
                        LocalDate.now(businessProperties.zoneId()),
                        pageRequest(page, size)
                )
                .map(saved -> jobDiscoveryMapper.toResponse(
                        saved.getJobPost(),
                        getState(userId, saved.getJobPost().getId())
                ));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobDiscoveryResponse> getInterested(
            UUID userId,
            InterestLevel level,
            int page,
            int size
    ) {
        Page<JobDiscoveryResponse> result = jobInterestRepository
                .findAllByApplicant_IdAndLevelAndStatusAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqualOrderByUpdatedAtDesc(
                        userId,
                        level,
                        InterestStatus.PENDING,
                        JobStatus.PUBLISHED,
                        LocalDate.now(businessProperties.zoneId()),
                        pageRequest(page, size)
                )
                .map(interest -> jobDiscoveryMapper.toResponse(
                        interest.getJobPost(),
                        getState(userId, interest.getJobPost().getId())
                ));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobDiscoveryResponse> getSkipped(UUID userId, int page, int size) {
        Page<JobDiscoveryResponse> result = skippedJobRepository
                .findAllByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqualOrderByCreatedAtDesc(
                        userId,
                        JobStatus.PUBLISHED,
                        LocalDate.now(businessProperties.zoneId()),
                        pageRequest(page, size)
                )
                .map(skipped -> jobDiscoveryMapper.toResponse(
                        skipped.getJobPost(),
                        getState(userId, skipped.getJobPost().getId())
                ));
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public DiscoverySummaryResponse getSummary(UUID userId) {
        return new DiscoverySummaryResponse(
                savedJobRepository.countByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
                        userId, JobStatus.PUBLISHED, LocalDate.now(businessProperties.zoneId())
                ),
                jobInterestRepository.countByApplicant_IdAndLevelAndStatusAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
                        userId, InterestLevel.INTERESTED, InterestStatus.PENDING, JobStatus.PUBLISHED, LocalDate.now(businessProperties.zoneId())
                ),
                jobInterestRepository.countByApplicant_IdAndLevelAndStatusAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
                        userId, InterestLevel.VERY_INTERESTED, InterestStatus.PENDING, JobStatus.PUBLISHED, LocalDate.now(businessProperties.zoneId())
                ),
                skippedJobRepository.countByUser_IdAndJobPost_ModerationHiddenFalseAndJobPost_StatusAndJobPost_ScheduledDateGreaterThanEqual(
                        userId, JobStatus.PUBLISHED, LocalDate.now(businessProperties.zoneId())
                ),
                jobMatchRepository.countByProvider_IdAndStatus(userId, MatchStatus.ACTIVE)
        );
    }

    @Override
    @Transactional
    public JobInteractionStateResponse save(UUID userId, UUID jobId) {
        JobPost jobPost = getDiscoverableJob(userId, jobId);
        if (!savedJobRepository.existsByUser_IdAndJobPost_Id(userId, jobId)) {
            savedJobRepository.save(SavedJob.builder()
                    .user(getActiveUser(userId))
                    .jobPost(jobPost)
                    .build());
        }
        return getState(userId, jobId);
    }

    @Override
    @Transactional
    public JobInteractionStateResponse unsave(UUID userId, UUID jobId) {
        savedJobRepository.findByUser_IdAndJobPost_Id(userId, jobId)
                .ifPresent(savedJobRepository::delete);
        return getState(userId, jobId);
    }

    @Override
    @Transactional
    public JobInteractionStateResponse skip(UUID userId, UUID jobId) {
        JobPost jobPost = getDiscoverableJob(userId, jobId);
        jobInterestRepository.findByApplicant_IdAndJobPost_Id(userId, jobId)
                .filter(interest -> interest.getStatus() == InterestStatus.PENDING
                        || interest.getStatus() == InterestStatus.ACCEPTED)
                .ifPresent(interest -> {
                    throw new AppException(ErrorCode.JOB_ALREADY_INTERESTED);
                });
        if (!skippedJobRepository.existsByUser_IdAndJobPost_Id(userId, jobId)) {
            skippedJobRepository.save(SkippedJob.builder()
                    .user(getActiveUser(userId))
                    .jobPost(jobPost)
                    .build());
        }
        return getState(userId, jobId);
    }

    @Override
    @Transactional
    public JobInteractionStateResponse restoreSkipped(UUID userId, UUID jobId) {
        skippedJobRepository.findByUser_IdAndJobPost_Id(userId, jobId)
                .ifPresent(skippedJobRepository::delete);
        return getState(userId, jobId);
    }

    @Override
    @Transactional
    public JobInteractionStateResponse expressInterest(UUID userId, UUID jobId, InterestLevel level) {
        identity.requireVerified(userId);
        JobPost jobPost = getDiscoverableJobForUpdate(userId, jobId);
        User applicant = getActiveUser(userId);
        JobInterest interest = jobInterestRepository.findByApplicant_IdAndJobPost_Id(userId, jobId)
                .orElseGet(() -> JobInterest.builder()
                        .applicant(applicant)
                        .jobPost(jobPost)
                        .build());
        boolean notifyOwner = interest.getId() == null || interest.getStatus() == InterestStatus.CANCELLED;

        if (interest.getStatus() == InterestStatus.ACCEPTED || interest.getStatus() == InterestStatus.REJECTED) {
            throw new AppException(ErrorCode.JOB_INTEREST_LOCKED);
        }

        interest.setLevel(level);
        interest.setStatus(InterestStatus.PENDING);
        interest.setRespondedAt(null);
        jobInterestRepository.save(interest);
        skippedJobRepository.findByUser_IdAndJobPost_Id(userId, jobId)
                .ifPresent(skippedJobRepository::delete);
        if (notifyOwner) {
            notificationService.create(
                    jobPost.getOwner(),
                    NotificationType.JOB_INTEREST_RECEIVED,
                    "Bạn có ứng viên mới",
                    "Có người vừa bày tỏ quan tâm đến công việc “" + jobPost.getTitle() + "”.",
                    jobPost.getId(),
                    "/posts/" + jobPost.getId() + "/candidates"
            );
        }
        return getState(userId, jobId);
    }

    @Override
    @Transactional
    public JobInteractionStateResponse withdrawInterest(UUID userId, UUID jobId) {
        jobPostRepository.findDiscoveryForUpdate(jobId);
        jobInterestRepository.findByApplicant_IdAndJobPost_Id(userId, jobId)
                .ifPresent(interest -> {
                    if (interest.getStatus() == InterestStatus.ACCEPTED) {
                        throw new AppException(ErrorCode.JOB_INTEREST_LOCKED);
                    }
                    if (interest.getStatus() == InterestStatus.PENDING) {
                        interest.setStatus(InterestStatus.CANCELLED);
                        jobInterestRepository.save(interest);
                    }
                });
        return getState(userId, jobId);
    }

    private JobPost getDiscoverableJob(UUID userId, UUID jobId) {
        JobPost jobPost = jobPostRepository.findDiscoveryById(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        if (jobPost.getOwner().getId().equals(userId)) {
            throw new AppException(ErrorCode.OWN_JOB_INTERACTION_NOT_ALLOWED);
        }
        if (jobPost.isModerationHidden() || jobPost.getStatus() != JobStatus.PUBLISHED || jobPost.getScheduledDate().isBefore(LocalDate.now(businessProperties.zoneId()))) {
            throw new AppException(ErrorCode.JOB_NOT_AVAILABLE);
        }
        return jobPost;
    }

    private JobPost getDiscoverableJobForUpdate(UUID userId, UUID jobId) {
        JobPost jobPost = jobPostRepository.findDiscoveryForUpdate(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        if (jobPost.getOwner().getId().equals(userId)) {
            throw new AppException(ErrorCode.OWN_JOB_INTERACTION_NOT_ALLOWED);
        }
        if (jobPost.isModerationHidden() || jobPost.getStatus() != JobStatus.PUBLISHED || jobPost.getScheduledDate().isBefore(LocalDate.now(businessProperties.zoneId()))
                || isFullyMatched(jobPost)) {
            throw new AppException(ErrorCode.JOB_NOT_AVAILABLE);
        }
        return jobPost;
    }

    private boolean isFullyMatched(JobPost jobPost) {
        return jobMatchRepository.countByJobPost_IdAndStatus(jobPost.getId(), MatchStatus.ACTIVE)
                >= jobPost.getRequiredWorkers();
    }

    private User getActiveUser(UUID userId) {
        return userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private JobInteractionStateResponse getState(UUID userId, UUID jobId) {
        JobInterest interest = jobInterestRepository.findByApplicant_IdAndJobPost_Id(userId, jobId)
                .orElse(null);
        return new JobInteractionStateResponse(
                savedJobRepository.existsByUser_IdAndJobPost_Id(userId, jobId),
                interest == null ? null : interest.getLevel(),
                interest == null ? null : interest.getStatus(),
                skippedJobRepository.existsByUser_IdAndJobPost_Id(userId, jobId)
        );
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
    }

    private String normalize(String value) {
        return StringUtils.hasText(value)
                ? value.trim().toLowerCase(Locale.ROOT)
                : "";
    }

    private void validateBudgetRange(BigDecimal minBudget, BigDecimal maxBudget) {
        if (minBudget != null && minBudget.signum() < 0) {
            throw new AppException(ErrorCode.INVALID_BUDGET_FILTER);
        }
        if (maxBudget != null && maxBudget.signum() < 0) {
            throw new AppException(ErrorCode.INVALID_BUDGET_FILTER);
        }
        if (minBudget != null && maxBudget != null && minBudget.compareTo(maxBudget) > 0) {
            throw new AppException(ErrorCode.INVALID_BUDGET_FILTER);
        }
    }
}
