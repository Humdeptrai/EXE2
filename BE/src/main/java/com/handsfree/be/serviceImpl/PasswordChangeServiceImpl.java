package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.UserRole;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.PasswordChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class PasswordChangeServiceImpl implements PasswordChangeService {
    private final UserRepository users;
    private final RefreshTokenRepository refresh;
    private final PasswordResetRepository resets;
    private final PasswordEncoder encoder;
    private final Map<UUID, Attempts> attempts = new HashMap<>();
    private record Attempts(long expiresAt, int count) {}

    private synchronized void allow(UUID userId) {
        long now = System.currentTimeMillis();
        attempts.entrySet().removeIf(entry -> entry.getValue().expiresAt() <= now);
        var previous = attempts.get(userId);
        int count = previous == null ? 1 : previous.count() + 1;
        if (count > 5) throw new AppException(ErrorCode.PASSWORD_CHANGE_RATE_LIMIT);
        attempts.put(userId, new Attempts(previous == null ? now + 60_000 : previous.expiresAt(), count));
    }

    @Override @Transactional
    public void change(UUID userId, int tokenVersion, String currentPassword, String newPassword) {
        allow(userId);
        var user = users.lockById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!user.isActive()) throw new AppException(ErrorCode.USER_DISABLED);
        if (user.getRole() != UserRole.USER) throw new AppException(ErrorCode.FORBIDDEN);
        // Recheck under the same owner lock used by reset/refresh.
        if (tokenVersion != user.getTokenVersion()) throw new AppException(ErrorCode.UNAUTHORIZED);
        if (user.getPasswordHash() == null) throw new AppException(ErrorCode.PASSWORD_CHANGE_UNAVAILABLE);
        if (currentPassword == null || currentPassword.isEmpty() || currentPassword.length() > 72
                || currentPassword.getBytes(StandardCharsets.UTF_8).length > 72
                || !encoder.matches(currentPassword, user.getPasswordHash()))
            throw new AppException(ErrorCode.PASSWORD_CURRENT_INCORRECT);
        if (newPassword == null || !newPassword.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,72}$")
                || newPassword.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new AppException(ErrorCode.PASSWORD_NEW_INVALID);
        if (encoder.matches(newPassword, user.getPasswordHash())) throw new AppException(ErrorCode.PASSWORD_NEW_UNCHANGED);
        user.setPasswordHash(encoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        refresh.deleteAllByUserId(userId);
        resets.consumeAll(userId, Instant.now());
        users.saveAndFlush(user);
    }
}
