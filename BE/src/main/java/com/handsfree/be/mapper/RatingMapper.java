package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.MatchRatingResponse;
import com.handsfree.be.dto.response.MatchUserResponse;
import com.handsfree.be.entity.MatchRating;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RatingMapper {
    public MatchRatingResponse toResponse(MatchRating rating) {
        return new MatchRatingResponse(
                rating.getId(),
                rating.getJobMatch().getId(),
                rating.getRater().getId(),
                rating.getRatedUser().getId(),
                rating.getRatedAsMode(),
                rating.getStars(),
                rating.getComment(),
                rating.getRatedAt()
        );
    }

    public MatchUserResponse toMatchUser(User user) {
        return new MatchUserResponse(
                user.getId(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getLocation(),
                user.getBio(),
                user.getProfileTags() == null ? List.of() : List.copyOf(user.getProfileTags()),
                user.isProfileCompleted()
        );
    }
}
