package com.handsfree.be.controller;
import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.ProfileSkillService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class ProfileSkillController {
    private final ProfileSkillService service;
    public record Name(@NotBlank @Size(min=2,max=40) String name) {}
    public record Review(boolean approved, @Size(max=300) String reason) {}
    private UUID user(Authentication a) { return UUID.fromString(a.getName()); }
    @GetMapping("/profile-skills") public ApiResponse<?> catalog(Authentication a) { return ApiResponse.success(200,"Danh mục kỹ năng và sở thích",service.catalog(user(a))); }
    @GetMapping("/profile-skills/mine") public ApiResponse<?> mine(Authentication a) { return ApiResponse.success(200,"Đề xuất của bạn",service.mine(user(a))); }
    @PostMapping("/profile-skills/proposals") public ApiResponse<?> propose(Authentication a,@Valid @RequestBody Name body) { return ApiResponse.success(200,"Đã gửi đề xuất",service.propose(user(a),body.name())); }
    @GetMapping("/admin/profile-skills") public ApiResponse<?> list(Authentication a,@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="0") int page) { return ApiResponse.success(200,"Danh sách kỹ năng và sở thích",service.search(user(a),search,status,page)); }
    @PostMapping("/admin/profile-skills") public ApiResponse<?> add(Authentication a,@Valid @RequestBody Name body) { return ApiResponse.success(200,"Đã thêm vào danh mục",service.add(user(a),body.name())); }
    @PutMapping("/admin/profile-skills/{id}/review") public ApiResponse<?> review(Authentication a,@PathVariable UUID id,@Valid @RequestBody Review body) { return ApiResponse.success(200,"Đã xử lý đề xuất",service.review(user(a),id,body.approved(),body.reason())); }
}
