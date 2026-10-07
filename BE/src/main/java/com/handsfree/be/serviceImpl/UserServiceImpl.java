package com.handsfree.be.serviceImpl;

import com.handsfree.be.dto.request.UpdateUserModeRequest;
import com.handsfree.be.dto.request.UpdateUserProfileRequest;
import com.handsfree.be.dto.response.UserResponse;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.UserMapper;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.service.UserService;
import com.handsfree.be.service.MediaStorageService;
import com.handsfree.be.storage.StoredFile;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final MediaStorageService mediaStorageService;

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return userMapper.toResponse(getActiveUser(userId));
    }

    @Override
    @Transactional
    public UserResponse updateCurrentUser(UUID userId, UpdateUserProfileRequest request) {
        User user = getActiveUser(userId);
        String phone = normalizeNullable(request.phone());

        if (phone != null && userRepository.existsByPhoneAndIdNot(phone, userId)) {
            throw new AppException(ErrorCode.PHONE_ALREADY_EXISTS);
        }

        ContactPrivacy.validate(request.fullName());
        ContactPrivacy.validate(request.bio());
        ContactPrivacy.validate(request.location());
        if (request.tags() != null) request.tags().forEach(ContactPrivacy::validate);
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        if (!StringUtils.hasText(user.getAvatarStorageKey())) {
            user.setAvatarUrl(normalizeNullable(request.avatarUrl()));
        }
        user.setBio(normalizeNullable(request.bio()));
        user.setLocation(normalizeNullable(request.location()));
        user.setProfileTags(normalizeTags(request.tags()));
        user.setProfileCompleted(isProfileCompleted(user));

        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse updateCurrentMode(UUID userId, UpdateUserModeRequest request) {
        User user = getActiveUser(userId);
        user.setCurrentMode(request.mode());
        return userMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse uploadAvatar(UUID userId, MultipartFile file) {
        User user = getActiveUser(userId);
        StoredFile stored = mediaStorageService.storeAvatar(file);
        String previousStorageKey = user.getAvatarStorageKey();
        user.setAvatarUrl(stored.publicUrl());
        user.setAvatarStorageKey(stored.storedName());
        UserResponse response = userMapper.toResponse(userRepository.save(user));
        if (StringUtils.hasText(previousStorageKey)) {
            mediaStorageService.delete(previousStorageKey);
        }
        return response;
    }

    @Override
    @Transactional
    public UserResponse deleteAvatar(UUID userId) {
        User user = getActiveUser(userId);
        String previousStorageKey = user.getAvatarStorageKey();
        user.setAvatarUrl(null);
        user.setAvatarStorageKey(null);
        UserResponse response = userMapper.toResponse(userRepository.save(user));
        if (StringUtils.hasText(previousStorageKey)) {
            mediaStorageService.delete(previousStorageKey);
        }
        return response;
    }

    private User getActiveUser(UUID userId) {
        return userRepository.findByIdAndActiveTrue(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private String normalizeNullable(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private Set<String> normalizeTags(java.util.List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return new LinkedHashSet<>();
        }

        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String tag : tags) {
            String cleanTag = tag == null ? "" : tag.trim().replaceAll("\\s+", " ");
            if (StringUtils.hasText(cleanTag)) {
                String duplicateKey = cleanTag.toLowerCase(Locale.ROOT);
                boolean duplicated = normalized.stream()
                        .anyMatch(existing -> existing.toLowerCase(Locale.ROOT).equals(duplicateKey));
                if (!duplicated) {
                    normalized.add(cleanTag);
                }
            }
        }
        return normalized;
    }

    private boolean isProfileCompleted(User user) {
        return StringUtils.hasText(user.getFullName())
                && StringUtils.hasText(user.getBio())
                && StringUtils.hasText(user.getLocation())
                && user.getProfileTags() != null
                && !user.getProfileTags().isEmpty();
    }
}
