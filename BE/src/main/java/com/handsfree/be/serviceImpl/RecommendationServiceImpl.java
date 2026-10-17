package com.handsfree.be.serviceImpl;

import com.handsfree.be.dto.response.RecommendationResponse;
import com.handsfree.be.repository.RecommendationRepository;
import com.handsfree.be.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationServiceImpl implements RecommendationService {
    private final RecommendationRepository repository;
    @Override public Map<UUID,RecommendationResponse> forCandidates(Collection<UUID> ids) { return repository.candidateScores(ids); }
    @Override public Map<UUID,RecommendationResponse> forJobs(UUID viewerId,Collection<UUID> ids) { return repository.jobScores(viewerId,ids); }
}
