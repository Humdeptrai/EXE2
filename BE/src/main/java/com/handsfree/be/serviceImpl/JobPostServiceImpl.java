package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.IdentityService;

import com.handsfree.be.constant.InterestStatus;
import com.handsfree.be.constant.JobListTab;
import com.handsfree.be.constant.JobStatus;
import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.dto.request.JobUpsertRequest;
import com.handsfree.be.dto.response.JobManagementSummaryResponse;
import com.handsfree.be.dto.response.JobMediaResponse;
import com.handsfree.be.dto.response.JobPostResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.entity.JobCategory;
import com.handsfree.be.entity.JobMedia;
import com.handsfree.be.entity.JobPost;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.JobPostMapper;
import com.handsfree.be.repository.JobCategoryRepository;
import com.handsfree.be.repository.JobInterestRepository;
import com.handsfree.be.repository.JobMediaRepository;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.repository.JobPostRepository;
import com.handsfree.be.repository.SavedJobRepository;
import com.handsfree.be.repository.SkippedJobRepository;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.service.JobPostService;
import com.handsfree.be.service.MediaStorageService;
import com.handsfree.be.storage.StoredFile;
import com.handsfree.be.storage.JobImageBatchUploader;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.handsfree.be.properties.BusinessProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JobPostServiceImpl implements JobPostService {
    private final BusinessProperties businessProperties;
    private final IdentityService identity;
    private static final int MAX_IMAGES = 5;

    private final JobPostRepository jobPostRepository;
    private final JobMediaRepository jobMediaRepository;
    private final JobInterestRepository jobInterestRepository;
    private final JobMatchRepository jobMatchRepository;
    private final SavedJobRepository savedJobRepository;
    private final SkippedJobRepository skippedJobRepository;
    private final JobCategoryRepository jobCategoryRepository;
    private final UserRepository userRepository;
    private final MediaStorageService mediaStorageService;
    private final JobImageBatchUploader jobImageBatchUploader;
    private final JobPostMapper jobPostMapper;

    @Override
    @Transactional
    public JobPostResponse createDraft(UUID userId, JobUpsertRequest request) {
        User owner = getActiveUser(userId);
        JobPost jobPost = JobPost.builder()
                .owner(owner)
                .status(JobStatus.DRAFT)
                .media(new ArrayList<>())
                .build();
        apply(jobPost, request);
        return toResponse(jobPostRepository.save(jobPost));
    }

    @Override
    @Transactional
    public JobPostResponse update(UUID userId, UUID jobId, JobUpsertRequest request) {
        JobPost jobPost = getOwnedJobForUpdate(userId, jobId);
        requireStatus(jobPost, Set.of(JobStatus.DRAFT, JobStatus.PUBLISHED), ErrorCode.JOB_EDIT_NOT_ALLOWED);
        if (jobPost.getStatus() == JobStatus.PUBLISHED) {
            long matchedCount = jobMatchRepository.countByJobPost_IdAndStatus(jobId, MatchStatus.ACTIVE);
            if (matchedCount > 0) {
                if (hasCoreFieldChanges(jobPost, request)) {
                    throw new AppException(ErrorCode.JOB_CORE_FIELDS_LOCKED_AFTER_MATCH);
                }
                if (request.requiredWorkers() < jobPost.getRequiredWorkers()) {
                    throw new AppException(ErrorCode.JOB_REQUIRED_WORKERS_DECREASE_NOT_ALLOWED);
                }
            }
        }
        apply(jobPost, request);
        return toResponse(jobPostRepository.save(jobPost));
    }

    @Override
    @Transactional(readOnly = true)
    public JobPostResponse getMineById(UUID userId, UUID jobId) {
        return toResponse(getOwnedJob(userId, jobId));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<JobPostResponse> getMine(UUID userId, JobListTab tab, int page, int size) {
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.min(Math.max(size, 1), 50);
        List<JobStatus> statuses = switch (tab) {
            case ACTIVE -> List.of(JobStatus.PUBLISHED);
            case COMPLETED -> List.of(JobStatus.COMPLETED, JobStatus.CANCELLED);
            case DRAFT -> List.of(JobStatus.DRAFT);
        };
        Page<JobPostResponse> result = jobPostRepository.findAllByOwner_IdAndStatusIn(
                        userId,
                        statuses,
                        PageRequest.of(normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "updatedAt"))
                )
                .map(this::toResponse);
        return PageResponse.from(result);
    }

    @Override
    @Transactional(readOnly = true)
    public JobManagementSummaryResponse getSummary(UUID userId) {
        return new JobManagementSummaryResponse(
                jobPostRepository.countByOwner_IdAndStatus(userId, JobStatus.PUBLISHED),
                jobPostRepository.countByOwner_IdAndStatusIn(userId, List.of(JobStatus.COMPLETED, JobStatus.CANCELLED)),
                jobPostRepository.countByOwner_IdAndStatus(userId, JobStatus.DRAFT)
        );
    }

    @Override
    @Transactional
    public JobPostResponse publish(UUID userId, UUID jobId) {
        identity.requireVerified(userId);
        JobPost jobPost = getOwnedJob(userId, jobId);
        if (jobPost.getStatus() == JobStatus.PUBLISHED) {
            return toResponse(jobPost);
        }
        requireStatus(jobPost, Set.of(JobStatus.DRAFT), ErrorCode.JOB_PUBLISH_NOT_ALLOWED);
        if (jobPost.getScheduledDate().isBefore(LocalDate.now(businessProperties.zoneId()))) {
            throw new AppException(ErrorCode.JOB_SCHEDULE_IN_PAST);
        }
        if (jobPost.getExpectedEndAt() == null || !jobPost.getExpectedEndAt().isAfter(
                LocalDateTime.of(jobPost.getScheduledDate(), jobPost.getStartTime()))) {
            throw new AppException(ErrorCode.JOB_END_TIME_INVALID);
        }
        jobPost.setStatus(JobStatus.PUBLISHED);
        jobPost.setPublishedAt(Instant.now());
        jobPost.setCancelledAt(null);
        return toResponse(jobPostRepository.save(jobPost));
    }

    @Override
    @Transactional
    public JobPostResponse cancel(UUID userId, UUID jobId) {
        JobPost jobPost = getOwnedJobForUpdate(userId, jobId);
        requireStatus(jobPost, Set.of(JobStatus.PUBLISHED), ErrorCode.JOB_CANCEL_NOT_ALLOWED);
        if (jobMatchRepository.countByJobPost_IdAndStatus(jobId, MatchStatus.ACTIVE) > 0) {
            throw new AppException(ErrorCode.JOB_HAS_ACTIVE_MATCHES);
        }
        jobPost.setStatus(JobStatus.CANCELLED);
        jobPost.setCancelledAt(Instant.now());
        return toResponse(jobPostRepository.save(jobPost));
    }

    @Override
    @Transactional
    public JobPostResponse repost(UUID userId, UUID jobId) {
        JobPost source = getOwnedJob(userId, jobId);
        requireStatus(source, Set.of(JobStatus.COMPLETED, JobStatus.CANCELLED), ErrorCode.JOB_REPOST_NOT_ALLOWED);

        JobPost copy = JobPost.builder()
                .owner(source.getOwner())
                .category(source.getCategory())
                .title(source.getTitle())
                .description(source.getDescription())
                .scheduledDate(source.getScheduledDate())
                .startTime(source.getStartTime())
                .expectedEndAt(source.getExpectedEndAt())
                .location(source.getLocation())
                .budgetAmount(source.getBudgetAmount())
                .budgetType(source.getBudgetType())
                .requiredWorkers(source.getRequiredWorkers())
                .status(JobStatus.DRAFT)
                .media(new ArrayList<>())
                .build();

        // Media is intentionally not duplicated so deleting the original post cannot break the new draft.
        return toResponse(jobPostRepository.save(copy));
    }

    @Override
    @Transactional
    public List<JobMediaResponse> addMedia(UUID userId, UUID jobId, List<MultipartFile> files) {
        JobPost jobPost = getOwnedJobForUpdate(userId, jobId);
        requireStatus(jobPost, Set.of(JobStatus.DRAFT, JobStatus.PUBLISHED), ErrorCode.JOB_EDIT_NOT_ALLOWED);
        if (files == null || files.isEmpty()) {
            throw new AppException(ErrorCode.EMPTY_FILE);
        }
        if (jobPost.getMedia().size() + files.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.TOO_MANY_JOB_IMAGES);
        }

        List<StoredFile> storedFiles = jobImageBatchUploader.upload(files);
        try {
            int startOrder = jobPost.getMedia().size();
            for (int index = 0; index < files.size(); index++) {
                StoredFile stored = storedFiles.get(index);
                jobPost.addMedia(JobMedia.builder()
                        .storedName(stored.storedName())
                        .originalName(stored.originalName())
                        .contentType(stored.contentType())
                        .fileSize(stored.fileSize())
                        .publicUrl(stored.publicUrl())
                        .displayOrder(startOrder + index)
                        .build());
            }
            JobPost saved = jobPostRepository.saveAndFlush(jobPost);
            return saved.getMedia().stream().map(jobPostMapper::toMediaResponse).toList();
        } catch (RuntimeException exception) {
            for (StoredFile stored : storedFiles) {
                try {
                    mediaStorageService.delete(stored.storedName());
                } catch (RuntimeException cleanupFailure) {
                    exception.addSuppressed(cleanupFailure);
                }
            }
            throw exception;
        }
    }

    @Override
    @Transactional
    public void deleteMedia(UUID userId, UUID jobId, UUID mediaId) {
        JobPost jobPost = getOwnedJob(userId, jobId);
        requireStatus(jobPost, Set.of(JobStatus.DRAFT, JobStatus.PUBLISHED), ErrorCode.JOB_EDIT_NOT_ALLOWED);
        JobMedia media = jobMediaRepository.findByIdAndJobPost_IdAndJobPost_Owner_Id(mediaId, jobId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_MEDIA_NOT_FOUND));
        jobPost.removeMedia(media);
        jobPostRepository.save(jobPost);
        mediaStorageService.delete(media.getStoredName());
    }

    @Override
    @Transactional
    public void delete(UUID userId, UUID jobId) {
        JobPost jobPost = getOwnedJobForUpdate(userId, jobId);
        requireStatus(jobPost, Set.of(JobStatus.DRAFT, JobStatus.CANCELLED), ErrorCode.JOB_DELETE_NOT_ALLOWED);
        if (jobMatchRepository.existsByJobPost_Id(jobId)) throw new AppException(ErrorCode.JOB_HAS_MATCH_HISTORY);
        List<String> storedNames = jobPost.getMedia().stream().map(JobMedia::getStoredName).toList();
        jobInterestRepository.deleteAllByJobPost_Id(jobId);
        skippedJobRepository.deleteAllByJobPost_Id(jobId);
        savedJobRepository.deleteAllByJobPost_Id(jobId);
        jobPostRepository.delete(jobPost);
        storedNames.forEach(mediaStorageService::delete);
    }

    private JobPostResponse toResponse(JobPost jobPost) {
        int applicantCount = Math.toIntExact(jobInterestRepository.countByJobPost_IdAndStatus(
                jobPost.getId(),
                InterestStatus.PENDING
        ));
        int matchedCount = Math.toIntExact(jobMatchRepository.countByJobPost_IdAndStatus(
                jobPost.getId(),
                MatchStatus.ACTIVE
        ));
        return jobPostMapper.toResponse(jobPost, applicantCount, matchedCount);
    }

    private boolean hasCoreFieldChanges(JobPost jobPost, JobUpsertRequest request) {
        return !jobPost.getCategory().getId().equals(request.categoryId())
                || !jobPost.getTitle().equals(request.title().trim())
                || !jobPost.getDescription().equals(request.description().trim())
                || !jobPost.getScheduledDate().equals(request.scheduledDate())
                || !jobPost.getStartTime().equals(request.startTime())
                || (jobPost.getExpectedEndAt() != null && !jobPost.getExpectedEndAt().equals(request.expectedEndAt()))
                || !jobPost.getLocation().equals(request.location().trim())
                || jobPost.getBudgetAmount().compareTo(request.budgetAmount()) != 0
                || jobPost.getBudgetType() != request.budgetType();
    }

    private void apply(JobPost jobPost, JobUpsertRequest request) {
        if (request.expectedEndAt() == null || !request.expectedEndAt().isAfter(
                java.time.LocalDateTime.of(request.scheduledDate(), request.startTime()))) {
            throw new AppException(ErrorCode.JOB_END_TIME_INVALID);
        }
        ContactPrivacy.validate(request.title());
        ContactPrivacy.validate(request.description());
        ContactPrivacy.validate(request.location());
        JobCategory category = jobCategoryRepository.findByIdAndActiveTrue(request.categoryId())
                .orElseThrow(() -> new AppException(ErrorCode.JOB_CATEGORY_NOT_FOUND));
        jobPost.setCategory(category);
        jobPost.setTitle(request.title().trim());
        jobPost.setDescription(request.description().trim());
        jobPost.setScheduledDate(request.scheduledDate());
        jobPost.setStartTime(request.startTime());
        jobPost.setExpectedEndAt(request.expectedEndAt());
        jobPost.setLocation(request.location().trim());
        jobPost.setBudgetAmount(request.budgetAmount());
        jobPost.setBudgetType(request.budgetType());
        jobPost.setRequiredWorkers(request.requiredWorkers());
    }

    private User getActiveUser(UUID userId) {
        return userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private JobPost getOwnedJob(UUID userId, UUID jobId) {
        return jobPostRepository.findByIdAndOwner_Id(jobId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
    }

    private JobPost getOwnedJobForUpdate(UUID userId, UUID jobId) {
        return jobPostRepository.findOwnedForMatchingUpdate(userId, jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
    }

    private void requireStatus(JobPost jobPost, Set<JobStatus> allowedStatuses, ErrorCode errorCode) {
        if (!allowedStatuses.contains(jobPost.getStatus())) {
            throw new AppException(errorCode);
        }
    }
}
