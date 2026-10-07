package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.dto.request.LoginRequest;
import com.handsfree.be.dto.response.AuthResponse;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class OperatorAuthController {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final AuthService auth;

    @PostMapping("/management/login")
    public ApiResponse<AuthResponse> management(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(200, "Đăng nhập thành công", auth.loginOperator(request));
    }

    @PostMapping("/admin/login")
    @Transactional
    public ApiResponse<AuthResponse> admin(@Valid @RequestBody LoginRequest request) {
        return login(request, UserRole.ADMIN);
    }

    @PostMapping("/staff/login")
    @Transactional
    public ApiResponse<AuthResponse> staff(@Valid @RequestBody LoginRequest request) {
        return login(request, UserRole.STAFF);
    }

    private ApiResponse<AuthResponse> login(LoginRequest request, UserRole required) {
        var user = users.findByEmailIgnoreCase(request.identifier().trim())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));
        if (user.getPasswordHash() == null || !encoder.matches(request.password(), user.getPasswordHash()))
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        if (!user.isActive()) throw new AppException(ErrorCode.USER_DISABLED);
        if (user.getRole() != required) throw new AppException(ErrorCode.FORBIDDEN);
        return ApiResponse.success(200, "Đăng nhập thành công", auth.loginOperator(request));
    }
}
