package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.serviceImpl.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class OperatorAnalyticsController {
    private final AccountAccess access;
    private final OperatorAnalyticsService analytics;

    @GetMapping("/admin/analytics")
    public ApiResponse<?> admin(Authentication authentication,
                                @RequestParam(required = false) String month) {
        access.operator(UUID.fromString(authentication.getName()), true);
        return ApiResponse.success(200, "Thống kê quản trị", analytics.admin(month));
    }

    @GetMapping("/staff/analytics")
    public ApiResponse<?> staff(Authentication authentication) {
        access.operator(UUID.fromString(authentication.getName()), false);
        return ApiResponse.success(200, "Thống kê kiểm duyệt", analytics.moderation());
    }
}
