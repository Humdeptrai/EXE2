package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.AdminMatchScheduleRequest;
import com.handsfree.be.service.AdminMatchScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/matches/{matchId}/schedule")
@RequiredArgsConstructor
public class AdminMatchScheduleController {
    private final AdminMatchScheduleService schedules;
    @GetMapping
    public ApiResponse<AdminMatchScheduleService.Schedule> get(Authentication actor, @PathVariable UUID matchId) {
        return ApiResponse.success(200, "Lịch công việc và phạm vi cập nhật", schedules.get(UUID.fromString(actor.getName()), matchId));
    }
    @PatchMapping
    public ApiResponse<AdminMatchScheduleService.Schedule> update(Authentication actor, @PathVariable UUID matchId,
            @Valid @RequestBody AdminMatchScheduleRequest request) {
        return ApiResponse.success(200, "Đã cập nhật lịch bài đăng và tất cả kết nối liên quan", schedules.update(UUID.fromString(actor.getName()), matchId, request));
    }
}
