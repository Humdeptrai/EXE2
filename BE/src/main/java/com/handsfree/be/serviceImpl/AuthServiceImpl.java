package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.AuthProvider;
import com.handsfree.be.constant.UserMode;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.dto.request.GoogleLoginRequest;
import com.handsfree.be.dto.request.LoginRequest;
import com.handsfree.be.dto.request.LogoutRequest;
import com.handsfree.be.dto.request.RefreshTokenRequest;
import com.handsfree.be.dto.request.RegisterRequest;
import com.handsfree.be.dto.response.AuthResponse;
import com.handsfree.be.dto.response.GoogleProfile;
import com.handsfree.be.entity.RefreshToken;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.mapper.UserMapper;
import com.handsfree.be.repository.RefreshTokenRepository;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.security.GoogleTokenVerifier;
import com.handsfree.be.security.JwtService;
import com.handsfree.be.security.TokenHash;
import com.handsfree.be.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        Identifier identifier = normalizeIdentifier(request.identifier());
        ensureIdentifierAvailable(identifier);

        User user = userRepository.save(User.builder()
                .fullName(request.fullName().trim())
                .email(identifier.email())
                .phone(identifier.phone())
                .passwordHash(passwordEncoder.encode(request.password()))
                .authProvider(AuthProvider.LOCAL)
                .role(UserRole.USER)
                .currentMode(UserMode.CONSUMER)
                .active(true)
                .build());

        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        return loginForPortal(request, false);
    }

    @Override
    @Transactional
    public AuthResponse loginOperator(LoginRequest request) {
        return loginForPortal(request, true);
    }

    private AuthResponse loginForPortal(LoginRequest request, boolean operator) {
        Identifier identifier = normalizeIdentifier(request.identifier());
        User user = findByIdentifier(identifier)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_CREDENTIALS));

        if (!user.isActive()) {
            throw new AppException(ErrorCode.USER_DISABLED);
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS);
        }

        boolean isOperator = user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.STAFF;
        if (operator ? !isOperator : user.getRole() != UserRole.USER) {
            throw new AppException(operator ? ErrorCode.OPERATOR_LOGIN_REQUIRED : ErrorCode.CUSTOMER_LOGIN_REQUIRED);
        }
        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleProfile profile = googleTokenVerifier.verify(request.credential());
        String email = profile.email().toLowerCase(Locale.ROOT);

        User bySubject = userRepository.findByGoogleSubject(profile.subject()).orElse(null);
        User byEmail = userRepository.findByEmailIgnoreCase(email).orElse(null);

        if (bySubject != null && byEmail != null && !bySubject.getId().equals(byEmail.getId())) {
            throw new AppException(ErrorCode.GOOGLE_ACCOUNT_CONFLICT);
        }

        User user = bySubject != null ? bySubject : byEmail;
        if (user != null && user.getGoogleSubject() != null
                && !user.getGoogleSubject().equals(profile.subject())) {
            throw new AppException(ErrorCode.GOOGLE_ACCOUNT_CONFLICT);
        }
        if (user == null) {
            user = User.builder()
                    .fullName(profile.fullName())
                    .email(email)
                    .googleSubject(profile.subject())
                    .authProvider(AuthProvider.GOOGLE)
                    .role(UserRole.USER)
                    .currentMode(UserMode.CONSUMER)
                    .active(true)
                    .build();
        } else {
            if (!user.isActive()) {
                throw new AppException(ErrorCode.USER_DISABLED);
            }
            if (user.getRole() != UserRole.USER) {
                throw new AppException(ErrorCode.CUSTOMER_LOGIN_REQUIRED);
            }
            user.setGoogleSubject(profile.subject());
            user.setAuthProvider(user.getPasswordHash() == null ? AuthProvider.GOOGLE : AuthProvider.BOTH);
            if (user.getFullName() == null || user.getFullName().isBlank()) {
                user.setFullName(profile.fullName());
            }
        }

        return createAuthResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository
                .findByTokenHashAndRevokedAtIsNull(TokenHash.sha256(request.refreshToken()))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN));

        if (storedToken.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new AppException(ErrorCode.INVALID_REFRESH_TOKEN);
        }

        User user = storedToken.getUser();
        if (!user.isActive()) {
            throw new AppException(ErrorCode.USER_DISABLED);
        }

        storedToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(storedToken);
        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public void logout(LogoutRequest request) {
        refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(TokenHash.sha256(request.refreshToken()))
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    private AuthResponse createAuthResponse(User user) {
        return new AuthResponse(userMapper.toResponse(user), jwtService.issueTokens(user));
    }

    private void ensureIdentifierAvailable(Identifier identifier) {
        boolean exists = identifier.email() != null
                ? userRepository.existsByEmailIgnoreCase(identifier.email())
                : userRepository.existsByPhone(identifier.phone());
        if (exists) {
            throw new AppException(ErrorCode.IDENTIFIER_ALREADY_EXISTS);
        }
    }

    private java.util.Optional<User> findByIdentifier(Identifier identifier) {
        return identifier.email() != null
                ? userRepository.findByEmailIgnoreCase(identifier.email())
                : userRepository.findByPhone(identifier.phone());
    }

    private Identifier normalizeIdentifier(String value) {
        String identifier = value == null ? "" : value.trim();
        if (identifier.contains("@")) {
            return new Identifier(identifier.toLowerCase(Locale.ROOT), null);
        }
        if (identifier.matches("^0\\d{9}$")) {
            return new Identifier(null, identifier);
        }
        throw new AppException(ErrorCode.INVALID_IDENTIFIER);
    }

    private record Identifier(String email, String phone) {}
}
