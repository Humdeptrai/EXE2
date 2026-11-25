package com.handsfree.be.service;

import com.handsfree.be.dto.request.AdminMatchScheduleRequest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public interface AdminMatchScheduleService {
    record Schedule(UUID matchId, UUID jobId, String title, LocalDateTime startAt, LocalDateTime endAt,
                    Instant updatedAt, long matchingCount, String timeZone) {}
    Schedule get(UUID actor, UUID matchId);
    Schedule update(UUID actor, UUID matchId, AdminMatchScheduleRequest request);
}
