package com.handsfree.be.controller;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.IdentityProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/identity/progress") @RequiredArgsConstructor
public class IdentityProgressController {
    private final IdentityProgressService progress;
    private UUID user(Authentication a) { return UUID.fromString(a.getName()); }
    @GetMapping public ApiResponse<?> get(Authentication a) { return ApiResponse.success(200,"Tiến trình đã lưu",progress.get(user(a))); }
    @PostMapping(value="/selfie",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> selfie(Authentication a,@RequestPart MultipartFile selfie) { return ApiResponse.success(200,"Đã lưu selfie",progress.selfie(user(a),selfie)); }
    @PostMapping(value="/documents/{side}",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> document(Authentication a,@PathVariable String side,@RequestPart MultipartFile document) { return ApiResponse.success(200,"Đã lưu bước CCCD",progress.document(user(a),side,document)); }
    @PostMapping("/finish") public ApiResponse<?> finish(Authentication a) { return ApiResponse.success(200,"Kết quả xác minh",progress.finish(user(a))); }
    @GetMapping("/images/{side}") public ResponseEntity<byte[]> image(Authentication a,@PathVariable String side) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options","nosniff").body(progress.image(user(a),side));
    }
}
