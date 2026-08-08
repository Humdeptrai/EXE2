package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.UserResponse;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserMapper {
    public UserResponse toResponse(User user) {
        List<String> tags = user.getProfileTags() == null
                ? List.of()
                : user.getProfileTags().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();

        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getAvatarUrl(),
                user.getBio(),
                user.getLocation(),
                tags,
                user.isProfileCompleted(),
                user.getAuthProvider(),
                user.getRole(),
                user.getCurrentMode(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
