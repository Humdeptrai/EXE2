package com.handsfree.be.mapper;

import com.handsfree.be.dto.response.UserResponse;
import com.handsfree.be.entity.User;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@lombok.RequiredArgsConstructor
public class UserMapper {
    private final com.handsfree.be.repository.ActivityLocationRepository activities;
    private final com.handsfree.be.repository.SavedAddressRepository addresses;
    public UserResponse toResponse(User user) {
        String area = user.getId() == null ? user.getLocation() : activities.findById(user.getId())
                .map(com.handsfree.be.entity.ActivityLocation::getArea)
                .orElseGet(()->addresses.findByOwnerIdOrderByDefaultAddressDescLabelAsc(user.getId()).stream()
                        .filter(com.handsfree.be.entity.SavedAddress::isDefaultAddress).findFirst()
                        .map(com.handsfree.be.entity.SavedAddress::getArea).orElse(user.getLocation()));
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
                area,
                tags,
                org.springframework.util.StringUtils.hasText(user.getFullName())
                        && user.getPhone() != null && user.getPhone().trim().matches("0[0-9]{9}")
                        && org.springframework.util.StringUtils.hasText(user.getLocation()),
                user.getAuthProvider(),
                user.getRole(),
                user.getCurrentMode(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
