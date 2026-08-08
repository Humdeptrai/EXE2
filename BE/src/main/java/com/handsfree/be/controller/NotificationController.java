package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.response.NotificationResponse;
import com.handsfree.be.dto.response.NotificationUnreadCountResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "8. Notification", description = "Notification center and unread state")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {
    private final NotificationService notificationService;

    @GetMapping
    @Operation(summary = "Get current user's notifications")
    public ResponseEntity<ApiResponse<PageResponse<NotificationResponse>>> getNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy thông báo thành công",
                notificationService.getNotifications(currentUserId(authentication), page, size)
        ));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Get unread notification count")
    public ResponseEntity<ApiResponse<NotificationUnreadCountResponse>> getUnreadCount(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy số thông báo chưa đọc thành công",
                notificationService.getUnreadCount(currentUserId(authentication))
        ));
    }

    @PostMapping("/{notificationId}/read")
    @Operation(summary = "Mark one notification as read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            Authentication authentication,
            @PathVariable UUID notificationId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã đánh dấu thông báo là đã đọc",
                notificationService.markRead(currentUserId(authentication), notificationId)
        ));
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<ApiResponse<NotificationUnreadCountResponse>> markAllRead(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã đọc tất cả thông báo",
                notificationService.markAllRead(currentUserId(authentication))
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
