package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.UserMode;
import com.handsfree.be.constant.NotificationType;
import com.handsfree.be.dto.request.MatchRatingRequest;
import com.handsfree.be.dto.response.MatchRatingResponse;
import com.handsfree.be.dto.response.MatchRatingStateResponse;
import com.handsfree.be.dto.response.RatingAggregateResponse;
import com.handsfree.be.dto.response.UserReputationResponse;
import com.handsfree.be.entity.JobMatch;
import com.handsfree.be.entity.MatchRating;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.RatingMapper;
import com.handsfree.be.properties.BusinessProperties;
import com.handsfree.be.repository.JobMatchRepository;
import com.handsfree.be.repository.MatchRatingRepository;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.service.RatingService;
import com.handsfree.be.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {
    private static final int RATING_DELAY_HOURS = 1;

    private final JobMatchRepository jobMatchRepository;
    private final MatchRatingRepository matchRatingRepository;
    private final UserRepository userRepository;
    private final RatingMapper ratingMapper;
    private final ContactAccess contactAccess;
    private final BusinessProperties businessProperties;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public MatchRatingStateResponse getMatchRatingState(UUID currentUserId, UUID matchId) {
        JobMatch match = requireParticipantMatch(currentUserId, matchId);
        MatchRating myRating = matchRatingRepository.findByJobMatch_IdAndRater_Id(matchId, currentUserId)
                .orElse(null);
        User counterpart = counterpart(match, currentUserId);
        Instant scheduledAt = scheduledAt(match);
        Instant eligibleAt = eligibleAt(match);
        boolean expired = expired(match, Instant.now());
        boolean connectionSucceeded = match.getConnectionSucceededAt() != null && contactAccess.unlocked(match);
        boolean ratingWindowOpen = !Instant.now().isBefore(eligibleAt) && !expired;
        boolean alreadyRated = myRating != null;

        return new MatchRatingStateResponse(
                match.getId(),
                match.getJobPost().getId(),
                com.handsfree.be.serviceImpl.ContactPrivacy.redact(match.getJobPost().getTitle()),
                contactAccess.user(counterpart, match),
                connectionSucceeded,
                match.getConnectionSucceededAt(),
                scheduledAt,
                eligibleAt,
                ratingWindowOpen,
                alreadyRated,
                connectionSucceeded && ratingWindowOpen && !alreadyRated,
                myRating == null ? null : ratingMapper.toResponse(myRating),
                buildReputation(counterpart.getId()),
                match.getConsumer().getId().equals(currentUserId) ? UserMode.PROVIDER : UserMode.CONSUMER,
                match.getExpectedEndAt(), match.getRatingClosesAt(), expired, contactAccess.unlocked(match)
        );
    }

    @Override
    @Transactional
    public MatchRatingResponse rateMatch(UUID currentUserId, UUID matchId, MatchRatingRequest request) {
        JobMatch match = requireParticipantMatch(currentUserId, matchId);
        if (match.getConnectionSucceededAt() == null || !contactAccess.unlocked(match)) {
            throw new AppException(ErrorCode.RATING_CONNECTION_REQUIRED);
        }

        Instant eligibleAt = eligibleAt(match);
        if (expired(match, Instant.now())) throw new AppException(ErrorCode.RATING_WINDOW_EXPIRED);
        if (Instant.now().isBefore(eligibleAt)) {
            throw new AppException(ErrorCode.RATING_NOT_AVAILABLE_YET);
        }
        if (matchRatingRepository.findByJobMatch_IdAndRater_Id(matchId, currentUserId).isPresent()) {
            throw new AppException(ErrorCode.RATING_ALREADY_SUBMITTED);
        }

        boolean currentUserIsConsumer = match.getConsumer().getId().equals(currentUserId);
        User rater = currentUserIsConsumer ? match.getConsumer() : match.getProvider();
        User ratedUser = currentUserIsConsumer ? match.getProvider() : match.getConsumer();
        UserMode ratedAsMode = currentUserIsConsumer ? UserMode.PROVIDER : UserMode.CONSUMER;

        MatchRating rating = matchRatingRepository.save(MatchRating.builder()
                .jobMatch(match)
                .rater(rater)
                .ratedUser(ratedUser)
                .ratedAsMode(ratedAsMode)
                .stars(request.stars())
                .comment(normalizeComment(request.comment()))
                .ratedAt(Instant.now())
                .build());
        notificationService.create(
                ratedUser,
                NotificationType.RATING_RECEIVED,
                "Bạn có đánh giá mới",
                "Bạn vừa nhận " + request.stars() + " sao từ một kết nối cho công việc “"
                        + match.getJobPost().getTitle() + "”.",
                match.getId(),
                "/profile"
        );
        return ratingMapper.toResponse(rating);
    }

    @Override
    @Transactional(readOnly = true)
    public UserReputationResponse getUserReputation(UUID userId) {
        userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return buildReputation(userId);
    }

    @Override
    @Transactional
    public java.util.List<MatchRatingStateResponse> pendingRatings(UUID userId) {
        userRepository.findByIdAndActiveTrue(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return jobMatchRepository.findPendingRatingIds(userId, Instant.now(), org.springframework.data.domain.PageRequest.of(0, 20))
                .stream().map(id -> getMatchRatingState(userId, id)).filter(MatchRatingStateResponse::canRate).toList();
    }

    @Override
    @Transactional
    public void dismissReminder(UUID userId, UUID matchId) {
        JobMatch match = requireParticipantMatch(userId, matchId);
        if (match.getConsumer().getId().equals(userId)) match.setConsumerRatingDismissedAt(Instant.now());
        else match.setProviderRatingDismissedAt(Instant.now());
    }

    @Override
    @Transactional
    public java.util.List<MatchRatingStateResponse> ratingsForJob(UUID userId, UUID jobId) {
        return jobMatchRepository.findRatingContextIds(userId, jobId).stream()
                .map(id -> getMatchRatingState(userId, id)).toList();
    }

    private Instant eligibleAt(JobMatch match) {
        // Legacy matching keeps its original rule; no invented finish time or expiry.
        return match.getRatingOpensAt() != null ? match.getRatingOpensAt()
                : scheduledAt(match).plusSeconds(RATING_DELAY_HOURS * 3600L);
    }

    private boolean expired(JobMatch match, Instant now) {
        return match.getRatingClosesAt() != null && !now.isBefore(match.getRatingClosesAt());
    }

    private UserReputationResponse buildReputation(UUID userId) {
        return new UserReputationResponse(
                userId,
                aggregate(matchRatingRepository.aggregateOverall(userId), jobMatchRepository.countSuccessfulConnections(userId)),
                aggregate(matchRatingRepository.aggregateByMode(userId, UserMode.CONSUMER), jobMatchRepository.countSuccessfulConnectionsAsConsumer(userId)),
                aggregate(matchRatingRepository.aggregateByMode(userId, UserMode.PROVIDER), jobMatchRepository.countSuccessfulConnectionsAsProvider(userId))
        );
    }

    private RatingAggregateResponse aggregate(Object[] row, long successfulMatchCount) {
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) row = nested;
        Number average = row != null && row.length > 0 && row[0] instanceof Number number ? number : null;
        Number count = row != null && row.length > 1 && row[1] instanceof Number number ? number : null;
        long ratingCount = count == null ? 0L : count.longValue();
        BigDecimal averageRating = average == null
                ? null
                : BigDecimal.valueOf(average.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        return new RatingAggregateResponse(averageRating, ratingCount, successfulMatchCount);
    }

    private JobMatch requireParticipantMatch(UUID currentUserId, UUID matchId) {
        return jobMatchRepository.findParticipantMatchForUpdate(matchId, currentUserId)
                .orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
    }

    private User counterpart(JobMatch match, UUID currentUserId) {
        return match.getConsumer().getId().equals(currentUserId) ? match.getProvider() : match.getConsumer();
    }

    private Instant scheduledAt(JobMatch match) {
        ZoneId zoneId = businessProperties.zoneId();
        return LocalDateTime.of(match.getJobPost().getScheduledDate(), match.getJobPost().getStartTime())
                .atZone(zoneId)
                .toInstant();
    }

    private String normalizeComment(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
