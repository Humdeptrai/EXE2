package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.request.AdminMatchScheduleRequest;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.JobPost;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.properties.BusinessProperties;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.repository.JobPostRepository;
import com.handsfree.be.service.AdminMatchScheduleService;
import com.handsfree.be.service.ManagementService;
import com.handsfree.be.service.NotificationService;
import com.handsfree.be.service.PlatformSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class AdminMatchScheduleServiceImpl implements AdminMatchScheduleService {
    private final AccountAccess access;
    private final JobMatchRepository matches;
    private final JobPostRepository jobs;
    private final PlatformSettingsService settings;
    private final BusinessProperties business;
    private final ManagementService management;
    private final NotificationService notifications;
    private final ContactAccess contacts;

    @Override @Transactional(readOnly = true)
    public Schedule get(UUID actor, UUID matchId) {
        access.operator(actor, true);
        var selected = matches.findById(matchId).orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        return response(selected, matches.countByJobPost_Id(selected.getJobPost().getId()));
    }

    @Override @Transactional
    public Schedule update(UUID actor, UUID matchId, AdminMatchScheduleRequest request) {
        access.operator(actor, true);
        if (request.startAt() == null || request.endAt() == null || !request.endAt().isAfter(request.startAt())
                || request.reason() == null || request.reason().isBlank() || request.reason().length() > 1000)
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        var jobId = matches.findJobIdForSchedule(matchId).orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        // Match acceptance also locks the job first. This prevents a new matching
        // appearing midway through rescheduling and keeps a consistent lock order.
        var job = jobs.findDiscoveryForUpdate(jobId)
                .orElseThrow(() -> new AppException(ErrorCode.JOB_NOT_FOUND));
        var affected = matches.lockAllForJob(job.getId());
        var selected = affected.stream().filter(match -> match.getId().equals(matchId)).findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        if (request.expectedUpdatedAt() == null || !Objects.equals(request.expectedUpdatedAt(), job.getUpdatedAt()))
            throw new AppException(ErrorCode.MATCH_SCHEDULE_CONFLICT);
        LocalDateTime previousStart = LocalDateTime.of(job.getScheduledDate(), job.getStartTime());
        LocalDateTime previousEnd = job.getExpectedEndAt();
        if (previousStart.equals(request.startAt()) && Objects.equals(previousEnd, request.endAt()))
            return response(selected, affected.size());

        Instant end = request.endAt().atZone(business.zoneId()).toInstant();
        if (!end.isAfter(request.startAt().atZone(business.zoneId()).toInstant()))
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        // Keep the delay/window originally saved for each matching. Legacy rows
        // without saved timing use the configured delay and the seven-day window.
        Duration fallbackDelay = null;
        for (JobMatch match : affected) {
            Duration delay;
            if (match.getExpectedEndAt() != null && match.getRatingOpensAt() != null
                    && !match.getRatingOpensAt().isBefore(match.getExpectedEndAt())) {
                delay = Duration.between(match.getExpectedEndAt(), match.getRatingOpensAt());
            } else {
                if (fallbackDelay == null) fallbackDelay = Duration.ofMinutes(settings.get().getRatingDelayMinutes());
                delay = fallbackDelay;
            }
            Duration window = match.getRatingOpensAt() != null && match.getRatingClosesAt() != null
                    && match.getRatingClosesAt().isAfter(match.getRatingOpensAt())
                    ? Duration.between(match.getRatingOpensAt(), match.getRatingClosesAt()) : Duration.ofDays(7);
            match.setExpectedEndAt(end);
            match.setRatingOpensAt(end.plus(delay));
            match.setRatingClosesAt(match.getRatingOpensAt().plus(window));
            match.setConsumerRatingDismissedAt(null);
            match.setProviderRatingDismissedAt(null);
        }
        job.setScheduledDate(request.startAt().toLocalDate());
        job.setStartTime(request.startAt().toLocalTime());
        job.setExpectedEndAt(request.endAt());
        matches.saveAll(affected);
        jobs.saveAndFlush(job);
        management.log(actor, "MATCH_SCHEDULE_CHANGE", "job=" + job.getId() + " selectedMatch=" + matchId
                + " oldStart=" + previousStart + " oldEnd=" + previousEnd
                + " newStart=" + request.startAt() + " newEnd=" + request.endAt()
                + " timeZone=" + business.zoneId() + " matchCount=" + affected.size() + " reason=" + request.reason().trim());
        notifyParticipants(selected, affected, request);
        return response(selected, affected.size());
    }

    private Schedule response(JobMatch selected, long count) {
        JobPost job = selected.getJobPost();
        return new Schedule(selected.getId(), job.getId(), job.getTitle(),
                LocalDateTime.of(job.getScheduledDate(), job.getStartTime()), job.getExpectedEndAt(),
                job.getUpdatedAt(), count, business.zoneId().getId());
    }

    private void notifyParticipants(JobMatch selected, List<JobMatch> affected, AdminMatchScheduleRequest request) {
        // A consumer can have many accepted providers. Notify each person once.
        record Recipient(User user, JobMatch match) {}
        var recipients = new LinkedHashMap<UUID, Recipient>();
        recipients.put(selected.getConsumer().getId(), new Recipient(selected.getConsumer(), selected));
        for (JobMatch match : affected) {
            recipients.putIfAbsent(match.getConsumer().getId(), new Recipient(match.getConsumer(), match));
            recipients.putIfAbsent(match.getProvider().getId(), new Recipient(match.getProvider(), match));
        }
        var format = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String title = selected.getJobPost().getTitle();
        if (title.length() > 120) title = title.substring(0, 120);
        String message = "Lịch mới cho “" + title + "”: " + request.startAt().format(format)
                + " đến " + request.endAt().format(format) + " (" + business.zoneId() + "). Quản trị viên đã cập nhật lịch.";
        for (Recipient recipient : recipients.values()) {
            JobMatch match = recipient.match();
            String target = match.getConnectionSucceededAt() != null && contacts.unlocked(match)
                    ? "/matches/" + match.getId() : "/matches/" + match.getId() + "/payment";
            notifications.create(recipient.user(), NotificationType.MATCH_SCHEDULE_CHANGED,
                    "Lịch công việc đã thay đổi", message, match.getId(), target);
        }
    }
}
