package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.FaceComparisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity/face-comparison")
@RequiredArgsConstructor
public class FaceComparisonController {
    private final FaceComparisonService comparison;
    private UUID user(Authentication a) { return UUID.fromString(a.getName()); }
    @PostMapping("/sessions")
    public ApiResponse<?> start(Authentication a,@RequestParam boolean consent) {
        return ApiResponse.success(200,"Bắt đầu quét khuôn mặt",comparison.start(user(a),consent));
    }
    @PostMapping(value="/sessions/{session}/frame",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> frame(Authentication a,@PathVariable UUID session,@RequestPart MultipartFile face) {
        return ApiResponse.success(200,"Tiến trình quét",comparison.frame(user(a),session,face));
    }
    @PostMapping(value="/sessions/{session}/finish",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> finish(Authentication a,@PathVariable UUID session,
            @RequestPart MultipartFile front,@RequestPart MultipartFile back) {
        return ApiResponse.success(200,"Kết quả quét và đối chiếu",comparison.finish(user(a),session,front,back));
    }
    @DeleteMapping("/sessions/{session}")
    public ApiResponse<?> cancel(Authentication a,@PathVariable UUID session) {
        comparison.cancel(user(a),session);
        return ApiResponse.success(200,"Đã hủy phiên quét",null);
    }
}
