package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.MatchRatingResponse;
import com.handsfree.be.entity.MatchRating;
import org.springframework.stereotype.Component;


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

}
