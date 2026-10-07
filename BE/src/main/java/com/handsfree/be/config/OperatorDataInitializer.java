package com.handsfree.be.config;

import com.handsfree.be.constant.*;
import com.handsfree.be.entity.User;
import com.handsfree.be.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Bootstrap only missing accounts. Never reset credentials or regrant revoked roles. */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.operator-bootstrap.enabled", havingValue = "true", matchIfMissing = true)
public class OperatorDataInitializer implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        create("admin@gmail.com", "Quản trị HandsFree", UserRole.ADMIN);
        create("staff@gmail.com", "Nhân viên HandsFree", UserRole.STAFF);
    }

    private void create(String email, String name, UserRole role) {
        var existing = users.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            if (existing.get().getRole() != role)
                log.warn("Bootstrap skipped existing account {} with a different role; review manually", email);
            return;
        }
        users.save(User.builder().email(email).fullName(name)
                .passwordHash(encoder.encode("12345678"))
                .authProvider(AuthProvider.LOCAL).role(role)
                .currentMode(UserMode.CONSUMER).profileCompleted(true).active(true).build());
        log.info("Created operator account {} with role {}", email, role);
    }
}
