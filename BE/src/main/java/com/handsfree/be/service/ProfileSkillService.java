package com.handsfree.be.service;
import com.handsfree.be.dto.response.PageResponse;
import java.time.Instant;
import java.util.*;
public interface ProfileSkillService {
    record Skill(UUID id, String name, String status, UUID submittedBy, String submittedName, Instant createdAt, String rejectionReason) {}
    List<Skill> catalog(UUID user);
    List<Skill> mine(UUID user);
    Skill propose(UUID user, String name);
    Skill add(UUID admin, String name);
    Skill review(UUID admin, UUID id, boolean approved, String reason);
    PageResponse<Skill> search(UUID admin, String search, String status, int page);
    Set<String> approvedTags(List<String> tags, Set<String> previous);
}
