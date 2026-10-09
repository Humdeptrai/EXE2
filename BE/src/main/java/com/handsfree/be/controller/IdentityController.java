package com.handsfree.be.controller;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.IdentityService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import java.util.UUID;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class IdentityController {
    private final IdentityService identity;
    private UUID id(Authentication a) { return UUID.fromString(a.getName()); }
    @GetMapping("/identity/eligibility")
    public ApiResponse<?> eligibility(Authentication a) {
        return ApiResponse.success(200, "Điều kiện đăng và nhận việc", identity.eligibility(id(a)));
    }
    @GetMapping("/identity")
    public ApiResponse<?> status(Authentication a) { return ApiResponse.success(200, "Xác thực danh tính", identity.status(id(a))); }
    @PostMapping(value = "/identity", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> submit(Authentication a, @RequestPart("front") MultipartFile front, @RequestPart("back") MultipartFile back,
            @RequestPart("face") MultipartFile face, @RequestPart("video") MultipartFile video, @RequestParam("consent") boolean consent) {
        return ApiResponse.success(200, "Đã đối chiếu hồ sơ", identity.submit(id(a), front, back, face, video, consent));
    }
    @GetMapping("/staff/identities")
    public ApiResponse<?> list(Authentication a, @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.success(200, "Trạng thái xác thực", identity.list(id(a),page));
    }
    @GetMapping("/admin/identities/{user}")
    public ApiResponse<?> dossier(Authentication a, @PathVariable UUID user) {
        return ApiResponse.success(200, "Hồ sơ xác thực", identity.dossier(id(a), user));
    }
    @GetMapping("/admin/identities/{user}/images/{kind}")
    public ResponseEntity<byte[]> image(Authentication a, @PathVariable UUID user, @PathVariable String kind) {
        return image(identity.adminImage(id(a), user, kind));
    }
    @GetMapping("/matches/{match}/counterpart-face")
    public ResponseEntity<byte[]> counterpart(Authentication a, @PathVariable UUID match) {
        return image(identity.counterpartFace(id(a), match));
    }
    private ResponseEntity<byte[]> image(byte[] data) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff").body(data);
    }
}
