package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.GoogleLoginRequest;
import com.handsfree.be.dto.request.LoginRequest;
import com.handsfree.be.dto.request.LogoutRequest;
import com.handsfree.be.dto.request.RefreshTokenRequest;
import com.handsfree.be.dto.request.RegisterRequest;
import com.handsfree.be.dto.response.AuthResponse;
import com.handsfree.be.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "1. Authentication", description = "Register, login, Google login, refresh and logout")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register with email or Vietnamese phone number")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(201, "Đăng ký tài khoản thành công", authService.register(request)));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email/phone and password")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(200, "Đăng nhập thành công", authService.login(request)));
    }

    @PostMapping("/google")
    @Operation(summary = "Login or register using a Google Identity Services ID token")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(200, "Đăng nhập Google thành công", authService.loginWithGoogle(request)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and issue a new token pair")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.success(200, "Làm mới phiên đăng nhập thành công", authService.refresh(request)));
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke a refresh token")
    public ResponseEntity<ApiResponse<Void>> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.success(200, "Đăng xuất thành công", null));
    }
}
