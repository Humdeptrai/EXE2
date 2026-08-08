package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.UpdateUserModeRequest;
import com.handsfree.be.dto.request.UpdateUserProfileRequest;
import com.handsfree.be.dto.response.UserResponse;
import com.handsfree.be.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "2. User", description = "Current-user profile and application-mode APIs")
@SecurityRequirement(name = "bearerAuth")
public class UserController {
    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user")
    public ResponseEntity<ApiResponse<UserResponse>> getMe(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy thông tin người dùng thành công",
                userService.getCurrentUser(currentUserId(authentication))
        ));
    }

    @PatchMapping("/me")
    @Operation(
            summary = "Update the authenticated user's profile",
            description = "A profile is considered complete when full name, location, bio and at least one profile tag are present. Phone and avatar are optional."
    )
    public ResponseEntity<ApiResponse<UserResponse>> updateMe(
            Authentication authentication,
            @Valid @RequestBody UpdateUserProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Cập nhật hồ sơ thành công",
                userService.updateCurrentUser(currentUserId(authentication), request)
        ));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload or replace the authenticated user's avatar")
    public ResponseEntity<ApiResponse<UserResponse>> uploadAvatar(
            Authentication authentication,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Cập nhật ảnh đại diện thành công",
                userService.uploadAvatar(currentUserId(authentication), file)
        ));
    }

    @DeleteMapping("/me/avatar")
    @Operation(summary = "Remove the authenticated user's managed avatar")
    public ResponseEntity<ApiResponse<UserResponse>> deleteAvatar(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Xóa ảnh đại diện thành công",
                userService.deleteAvatar(currentUserId(authentication))
        ));
    }

    @PatchMapping("/me/mode")
    @Operation(
            summary = "Switch between consumer and provider mode",
            description = "Switching mode changes the current product experience only; it does not change the user's system role or active jobs."
    )
    public ResponseEntity<ApiResponse<UserResponse>> updateMode(
            Authentication authentication,
            @Valid @RequestBody UpdateUserModeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Chuyển chế độ sử dụng thành công",
                userService.updateCurrentMode(currentUserId(authentication), request)
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
