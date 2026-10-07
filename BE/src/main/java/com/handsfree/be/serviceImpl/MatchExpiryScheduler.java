package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.MatchStatus;
import com.handsfree.be.repository.JobMatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class MatchExpiryScheduler {
    private final JobMatchRepository matches;
    private final MatchExpiryService expiry;
    @Scheduled(fixedDelayString = "${app.match-expiry-delay-ms:15000}")
    public void sweep() {
        for (var id : matches.findDueIds(MatchStatus.ACTIVE, Instant.now(), PageRequest.of(0, 100))) {
            try { expiry.expire(id); }
            catch (Exception e) { log.error("Matching expiry failed for {}; will retry", id); }
        }
    }
}
