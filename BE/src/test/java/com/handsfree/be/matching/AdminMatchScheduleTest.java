package com.handsfree.be.matching;

import com.handsfree.be.constant.*;
import com.handsfree.be.dto.request.AdminMatchScheduleRequest;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.properties.BusinessProperties;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.serviceImpl.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminMatchScheduleTest {
    AccountAccess access = mock(AccountAccess.class);
    JobMatchRepository matches = mock(JobMatchRepository.class);
    JobPostRepository jobs = mock(JobPostRepository.class);
    PlatformSettingsService settings = mock(PlatformSettingsService.class);
    ManagementService audit = mock(ManagementService.class);
    NotificationService notices = mock(NotificationService.class);
    ContactAccess contacts = mock(ContactAccess.class);
    AdminMatchScheduleServiceImpl service = new AdminMatchScheduleServiceImpl(access,matches,jobs,settings,
            new BusinessProperties("Asia/Ho_Chi_Minh"),audit,notices,contacts);
    UUID actor = UUID.randomUUID();
    Instant revision = Instant.parse("2026-01-01T00:00:00Z");
    LocalDateTime start = LocalDateTime.parse("2025-12-01T08:00:00"), end = start.plusDays(1);
    User owner = User.builder().id(UUID.randomUUID()).build();
    JobPost job = JobPost.builder().id(UUID.randomUUID()).owner(owner).title("Synthetic work")
            .scheduledDate(LocalDate.of(2026,1,1)).startTime(LocalTime.of(8,0))
            .expectedEndAt(LocalDateTime.of(2026,1,2,8,0)).build();
    JobMatch matching(int delay, MatchStatus status) {
        Instant originalEnd = Instant.parse("2026-01-02T01:00:00Z");
        return JobMatch.builder().id(UUID.randomUUID()).jobPost(job).consumer(owner)
                .provider(User.builder().id(UUID.randomUUID()).build()).status(status)
                .matchedAt(revision).paymentDeadlineAt(revision.plusSeconds(3600))
                .connectionSucceededAt(revision).expectedEndAt(originalEnd)
                .ratingOpensAt(originalEnd.plusSeconds(delay*60L))
                .ratingClosesAt(originalEnd.plusSeconds(delay*60L).plus(Duration.ofDays(7)))
                .consumerRatingDismissedAt(revision).build();
    }
    JobMatch prepare() {
        ReflectionTestUtils.setField(job,"updatedAt",revision);
        JobMatch first = matching(60,MatchStatus.ACTIVE), second = matching(90,MatchStatus.COMPLETED);
        when(matches.findJobIdForSchedule(first.getId())).thenReturn(Optional.of(job.getId()));
        when(jobs.findDiscoveryForUpdate(job.getId())).thenReturn(Optional.of(job));
        when(matches.lockAllForJob(job.getId())).thenReturn(List.of(first,second));
        return first;
    }
    AdminMatchScheduleRequest request(Instant expected) {
        return new AdminMatchScheduleRequest(start,end,expected,"Correct agreed work dates");
    }
    @Test void backdatesEntireJobPreservingRatingDelaysPaymentAndHistory() {
        JobMatch first=prepare(), second=matches.lockAllForJob(job.getId()).get(1);
        when(contacts.unlocked(first)).thenReturn(true);
        var result=service.update(actor,first.getId(),request(revision));
        Instant newEnd=Instant.parse("2025-12-02T01:00:00Z");
        assertEquals(start.toLocalDate(),job.getScheduledDate()); assertEquals(start.toLocalTime(),job.getStartTime());
        assertEquals(end,job.getExpectedEndAt()); assertEquals(2,result.matchingCount());
        assertEquals(newEnd,first.getExpectedEndAt()); assertEquals(newEnd,second.getExpectedEndAt());
        assertEquals(newEnd.plusSeconds(3600),first.getRatingOpensAt());
        assertEquals(newEnd.plusSeconds(5400),second.getRatingOpensAt());
        assertEquals(Duration.ofDays(7),Duration.between(second.getRatingOpensAt(),second.getRatingClosesAt()));
        assertNull(first.getConsumerRatingDismissedAt()); assertEquals(revision.plusSeconds(3600),first.getPaymentDeadlineAt());
        assertEquals(revision,first.getMatchedAt()); assertEquals(revision,first.getConnectionSucceededAt());
        assertEquals(MatchStatus.COMPLETED,second.getStatus()); verify(settings,never()).get();
        verify(jobs).saveAndFlush(job);
        verify(audit).log(eq(actor),eq("MATCH_SCHEDULE_CHANGE"),contains("matchCount=2"));
        verify(notices,times(3)).create(any(),eq(NotificationType.MATCH_SCHEDULE_CHANGED),anyString(),anyString(),any(),anyString());
        verify(notices).create(eq(owner),eq(NotificationType.MATCH_SCHEDULE_CHANGED),anyString(),anyString(),eq(first.getId()),eq("/matches/"+first.getId()));
    }
    @Test void staleRevisionDoesNotSaveOrNotify() {
        var first=prepare();
        assertEquals(ErrorCode.MATCH_SCHEDULE_CONFLICT,assertThrows(AppException.class,
                ()->service.update(actor,first.getId(),request(revision.minusSeconds(1)))).getErrorCode());
        verify(jobs,never()).saveAndFlush(any()); verifyNoInteractions(notices,audit);
        assertEquals(LocalDate.of(2026,1,1),job.getScheduledDate());
    }
    @Test void invalidIntervalRejectedBeforeLoadingJob() {
        assertEquals(ErrorCode.VALIDATION_FAILED,assertThrows(AppException.class,
                ()->service.update(actor,UUID.randomUUID(),new AdminMatchScheduleRequest(end,start,revision,"reason"))).getErrorCode());
        verifyNoInteractions(matches,jobs,notices,audit);
    }
    @Test void unchangedScheduleHasNoSideEffects() {
        var first=prepare();
        service.update(actor,first.getId(),new AdminMatchScheduleRequest(LocalDateTime.of(job.getScheduledDate(),job.getStartTime()),job.getExpectedEndAt(),revision,"Same dates"));
        verify(jobs,never()).saveAndFlush(any()); verifyNoInteractions(notices,audit);
    }
    @Test void legacyTimingUsesConfiguredDelayAndSevenDayWindow() {
        var first=prepare(); first.setExpectedEndAt(null); first.setRatingOpensAt(null); first.setRatingClosesAt(null);
        var config=new PlatformSettings(); config.setRatingDelayMinutes(120); when(settings.get()).thenReturn(config);
        service.update(actor,first.getId(),request(revision));
        assertEquals(Instant.parse("2025-12-02T03:00:00Z"),first.getRatingOpensAt());
        assertEquals(Duration.ofDays(7),Duration.between(first.getRatingOpensAt(),first.getRatingClosesAt()));
    }
    @Test void accessDeniedBeforeAnyDataAccess() {
        doThrow(new AppException(ErrorCode.FORBIDDEN)).when(access).operator(actor,true);
        assertThrows(AppException.class,()->service.get(actor,UUID.randomUUID()));
        assertThrows(AppException.class,()->service.update(actor,UUID.randomUUID(),request(revision)));
        verifyNoInteractions(matches,jobs,notices,audit);
    }
}
