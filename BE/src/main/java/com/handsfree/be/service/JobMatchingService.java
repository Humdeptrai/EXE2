package com.handsfree.be.service;

import com.handsfree.be.dto.response.CandidateResponse;
import com.handsfree.be.dto.response.MatchResponse;
import com.handsfree.be.dto.response.PageResponse;

import java.util.UUID;

public interface JobMatchingService {
    PageResponse<CandidateResponse> getCandidates(UUID consumerId, UUID jobId, int page, int size);

    CandidateResponse getCandidate(UUID consumerId, UUID jobId, UUID interestId);

    MatchResponse acceptCandidate(UUID consumerId, UUID jobId, UUID interestId);

    CandidateResponse rejectCandidate(UUID consumerId, UUID jobId, UUID interestId);

    PageResponse<MatchResponse> getProviderMatches(UUID providerId, int page, int size);

    PageResponse<MatchResponse> getConsumerMatches(UUID consumerId, int page, int size);
}
