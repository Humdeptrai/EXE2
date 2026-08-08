package com.handsfree.be.service;

import com.handsfree.be.dto.request.GoogleLoginRequest;
import com.handsfree.be.dto.request.LoginRequest;
import com.handsfree.be.dto.request.LogoutRequest;
import com.handsfree.be.dto.request.RefreshTokenRequest;
import com.handsfree.be.dto.request.RegisterRequest;
import com.handsfree.be.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse loginWithGoogle(GoogleLoginRequest request);
    AuthResponse refresh(RefreshTokenRequest request);
    void logout(LogoutRequest request);
}
