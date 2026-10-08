package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.serviceImpl.AccountAccess;
import com.handsfree.be.serviceImpl.FaceComparisonService;
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
    private final AccountAccess access;
    private final FaceComparisonService comparison;
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> compare(Authentication authentication,
            @RequestPart("front") MultipartFile front, @RequestPart("face") MultipartFile face,
            @RequestParam("consent") boolean consent) {
        access.active(UUID.fromString(authentication.getName()));
        return ApiResponse.success(200, "Kết quả đối chiếu ảnh", comparison.compare(front, face, consent));
    }
}
