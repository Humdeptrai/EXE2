package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.OnlineUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class OnlineUserController {
    private final OnlineUserService onlineUsers;
    @GetMapping("/api/v1/admin/presence")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<OnlineUserService.Snapshot> snapshot(Authentication actor) {
        return ApiResponse.success(200, "Tài khoản đang online", onlineUsers.snapshot(UUID.fromString(actor.getName())));
    }
}
