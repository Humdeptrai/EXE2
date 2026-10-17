package com.handsfree.be.service;

import com.handsfree.be.dto.response.RecommendationResponse;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;

public interface RecommendationService {
    Map<UUID, RecommendationResponse> forCandidates(Collection<UUID> interestIds);
    Map<UUID, RecommendationResponse> forJobs(UUID viewerId, Collection<UUID> jobIds);
}
