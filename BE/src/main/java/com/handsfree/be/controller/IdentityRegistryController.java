package com.handsfree.be.controller;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.IdentityRegistryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequiredArgsConstructor @RequestMapping("/api/v1/admin/identity-registry") @PreAuthorize("hasRole('ADMIN')")
public class IdentityRegistryController {
 private final IdentityRegistryService registry;
 @GetMapping("/{user}/evidence") public ApiResponse<?> evidence(Authentication a,@PathVariable UUID user){return ApiResponse.success(200,"Danh tính đã được ghi nhận",registry.evidence(UUID.fromString(a.getName()),user));}
 @GetMapping("/{user}/images/{kind}") public org.springframework.http.ResponseEntity<byte[]> image(Authentication a,@PathVariable UUID user,@PathVariable String kind){return org.springframework.http.ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_JPEG).cacheControl(org.springframework.http.CacheControl.noStore()).header("X-Content-Type-Options","nosniff").body(registry.image(UUID.fromString(a.getName()),user,kind));}
 @GetMapping("/{user}") public ApiResponse<?> inspect(Authentication a,@PathVariable UUID user){return ApiResponse.success(200,"Đối chiếu danh tính",registry.inspect(UUID.fromString(a.getName()),user));}
 @PostMapping("/backfill") public ApiResponse<?> backfill(Authentication a){return ApiResponse.success(200,"Đã cập nhật chỉ mục khuôn mặt",registry.backfill(UUID.fromString(a.getName())));}
}
