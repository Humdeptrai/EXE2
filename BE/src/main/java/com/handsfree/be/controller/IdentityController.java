package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.serviceImpl.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.http.*;
import org.springframework.data.domain.*;
import java.util.UUID;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class IdentityController {
    private final IdentityService identity;
    private final IdentityRepository identities;
    private final AccountAccess access;
    private final JobMatchRepository matches;
    private final ContactAccess contacts;
    private final ManagementService management;
    private UUID id(Authentication a) { return UUID.fromString(a.getName()); }
    @GetMapping("/identity")
    public ApiResponse<?> status(Authentication a) { return ApiResponse.success(200, "Xác thực danh tính", identity.status(id(a))); }
    @PostMapping(value = "/identity", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<?> submit(Authentication a, @RequestPart("front") MultipartFile front, @RequestPart("back") MultipartFile back,
            @RequestPart("face") MultipartFile face, @RequestPart("video") MultipartFile video, @RequestParam("consent") boolean consent) {
        return ApiResponse.success(200, "Đã đối chiếu hồ sơ", identity.submit(id(a), front, back, face, video, consent));
    }
    @GetMapping("/staff/identities")
    public ApiResponse<?> list(Authentication a, @RequestParam(defaultValue = "0") int page) {
        access.operator(id(a), false);
        return ApiResponse.success(200, "Trạng thái xác thực", com.handsfree.be.dto.response.PageResponse.from(
                identities.findAllProjectedBy(PageRequest.of(Math.max(page, 0), 20, Sort.by(Sort.Direction.DESC, "submittedAt"))).map(identity::summary)));
    }
    @GetMapping("/admin/identities/{user}")
    public ApiResponse<?> dossier(Authentication a, @PathVariable UUID user) {
        var result = identity.dossier(id(a), user);
        management.log(id(a), "IDENTITY_VIEW", user.toString());
        return ApiResponse.success(200, "Hồ sơ xác thực", result);
    }
    @GetMapping("/admin/identities/{user}/images/{kind}")
    public ResponseEntity<byte[]> image(Authentication a, @PathVariable UUID user, @PathVariable String kind) {
        var data = identity.adminImage(id(a), user, kind);
        management.log(id(a), "IDENTITY_IMAGE_VIEW", user + " " + kind);
        return image(data);
    }
    @GetMapping("/matches/{match}/counterpart-face")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<byte[]> counterpart(Authentication a, @PathVariable UUID match) {
        access.active(id(a));
        var m = matches.findById(match).orElseThrow(() -> new AppException(ErrorCode.MATCH_NOT_FOUND));
        if (!m.getConsumer().getId().equals(id(a)) && !m.getProvider().getId().equals(id(a))) throw new AppException(ErrorCode.MATCH_NOT_FOUND);
        if (!contacts.unlocked(m)) throw new AppException(ErrorCode.CHAT_NOT_UNLOCKED);
        UUID other = m.getConsumer().getId().equals(id(a)) ? m.getProvider().getId() : m.getConsumer().getId();
        return image(identity.verifiedFace(other));
    }
    private ResponseEntity<byte[]> image(byte[] data) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff").body(data);
    }
}
