package com.handsfree.be.service;

import com.handsfree.be.dto.request.UpdateUserModeRequest;
import com.handsfree.be.dto.request.UpdateUserProfileRequest;
import com.handsfree.be.dto.response.UserResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface UserService {
    UserResponse getCurrentUser(UUID userId);

    UserResponse updateCurrentUser(UUID userId, UpdateUserProfileRequest request);

    UserResponse updateCurrentMode(UUID userId, UpdateUserModeRequest request);

    UserResponse uploadAvatar(UUID userId, MultipartFile file);

    UserResponse deleteAvatar(UUID userId);
}
