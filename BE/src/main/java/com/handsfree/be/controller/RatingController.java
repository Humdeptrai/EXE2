package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.MatchRatingRequest;
import com.handsfree.be.dto.response.MatchRatingResponse;
import com.handsfree.be.dto.response.MatchRatingStateResponse;
import com.handsfree.be.dto.response.UserReputationResponse;
import com.handsfree.be.service.RatingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "10. Rating & Reputation", description = "Post-connection bilateral ratings and reputation summaries")
public class RatingController {
    private final RatingService ratingService;

    @GetMapping("/matches/{matchId}/rating")
    @Operation(summary = "Get current user's rating eligibility and rating state for a Match")
    public ResponseEntity<ApiResponse<MatchRatingStateResponse>> getMatchRatingState(
            Authentication authentication,
            @PathVariable UUID matchId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy trạng thái đánh giá thành công",
                ratingService.getMatchRatingState(currentUserId(authentication), matchId)
        ));
    }

    @PostMapping("/matches/{matchId}/rating")
    @Operation(summary = "Rate the counterpart after connection success and scheduled time plus one hour")
    public ResponseEntity<ApiResponse<MatchRatingResponse>> rateMatch(
            Authentication authentication,
            @PathVariable UUID matchId,
            @Valid @RequestBody MatchRatingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đánh giá thành công",
                ratingService.rateMatch(currentUserId(authentication), matchId, request)
        ));
    }

    @GetMapping("/users/{userId}/reputation")
    @Operation(summary = "Get public reputation summary for a user")
    public ResponseEntity<ApiResponse<UserReputationResponse>> getUserReputation(@PathVariable UUID userId) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy uy tín người dùng thành công",
                ratingService.getUserReputation(userId)
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
