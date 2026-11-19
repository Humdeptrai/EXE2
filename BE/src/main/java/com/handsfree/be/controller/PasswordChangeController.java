package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.PasswordChangeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/users/me/password") @RequiredArgsConstructor
public class PasswordChangeController {
    private final PasswordChangeService passwords;
    public record ChangePassword(
        @NotBlank @Size(max=72) String currentPassword,
        @NotBlank @Pattern(regexp="^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message="Mật khẩu cần 8–72 ký tự, gồm chữ và số") String newPassword
    ) {}

    @PostMapping
    @io.swagger.v3.oas.annotations.Operation(summary = "Change current user password and revoke existing sessions")
    public ApiResponse<?> change(JwtAuthenticationToken authentication, @Valid @RequestBody ChangePassword request) {
        Number version = authentication.getToken().getClaim("tokenVersion");
        passwords.change(UUID.fromString(authentication.getName()), version == null ? 0 : version.intValue(),
            request.currentPassword(), request.newPassword());
        return ApiResponse.success(200, "Đã đổi mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.", null);
    }
}
