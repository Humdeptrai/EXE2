package com.handsfree.be.service;

import com.handsfree.be.dto.request.MatchRatingRequest;
import com.handsfree.be.dto.response.MatchRatingResponse;
import com.handsfree.be.dto.response.MatchRatingStateResponse;
import com.handsfree.be.dto.response.UserReputationResponse;

import java.util.UUID;

public interface RatingService {
    MatchRatingStateResponse getMatchRatingState(UUID currentUserId, UUID matchId);

    MatchRatingResponse rateMatch(UUID currentUserId, UUID matchId, MatchRatingRequest request);

    UserReputationResponse getUserReputation(UUID userId);
    java.util.List<MatchRatingStateResponse> pendingRatings(UUID userId);
    void dismissReminder(UUID userId, UUID matchId);
    java.util.List<MatchRatingStateResponse> ratingsForJob(UUID userId, UUID jobId);
}
