package com.handsfree.be.auth;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.security.JwtService;
import com.handsfree.be.dto.response.TokenResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes=HandsFreeApplication.class, webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:password-change;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
    "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
class PasswordChangeHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired RefreshTokenRepository refresh;
    @Autowired PasswordResetRepository resets;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtService jwt;
    @Autowired TransactionTemplate tx;
    @Autowired ObjectMapper json;
    UUID userId;
    TokenResponse tokens;
    final HttpClient client = HttpClient.newHttpClient();
    static final String OLD = "OldPassword123", NEW = "NewPassword456";

    @BeforeEach void setup() {
        tx.executeWithoutResult(status -> {
            var user = account(UserRole.USER, AuthProvider.LOCAL, true);
            userId = user.getId(); tokens = jwt.issueTokens(user);
            var reset = new PasswordReset(); reset.setTokenHash(userId.toString()); reset.setUserId(userId);
            reset.setCreatedAt(Instant.now()); reset.setExpiresAt(Instant.now().plusSeconds(900)); resets.saveAndFlush(reset);
        });
    }
    User account(UserRole role, AuthProvider provider, boolean active) {
        return users.saveAndFlush(User.builder().fullName("Synthetic password user").email(UUID.randomUUID()+"@example.invalid")
            .passwordHash(provider == AuthProvider.GOOGLE ? null : encoder.encode(OLD)).role(role)
            .authProvider(provider).currentMode(UserMode.CONSUMER).active(active).profileCompleted(true).build());
    }
    HttpResponse<String> call(String path, Object body, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path))
            .header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer "+token);
        request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
    HttpResponse<String> change(String current, String next, String token) throws Exception {
        return call("/users/me/password", Map.of("currentPassword", current, "newPassword", next), token);
    }
    void assertCode(int status, int code, HttpResponse<String> response) {
        assertEquals(status, response.statusCode(), response.body());
        assertEquals(code, json.readTree(response.body()).path("code").asInt(), response.body());
    }
    void unchanged() {
        var user = users.findById(userId).orElseThrow();
        assertTrue(encoder.matches(OLD, user.getPasswordHash())); assertEquals(0, user.getTokenVersion());
        assertTrue(resets.findById(userId.toString()).orElseThrow().getConsumedAt() == null);
    }
    @Test void changeRevokesSessionsAndResetLinksAndOnlyNewPasswordCanLogin() throws Exception {
        assertEquals(200, change(OLD, NEW, tokens.accessToken()).statusCode());
        var user = users.findById(userId).orElseThrow();
        assertTrue(encoder.matches(NEW, user.getPasswordHash())); assertFalse(encoder.matches(OLD, user.getPasswordHash()));
        assertNotEquals(NEW, user.getPasswordHash()); assertEquals(1, user.getTokenVersion());
        assertTrue(refresh.findAll().stream().noneMatch(t -> t.getUser().getId().equals(userId)));
        assertNotNull(resets.findById(userId.toString()).orElseThrow().getConsumedAt());
        assertEquals(401, change(NEW, "AnotherPassword789", tokens.accessToken()).statusCode());
        assertEquals(401, call("/auth/refresh", Map.of("refreshToken", tokens.refreshToken()), null).statusCode());
        assertEquals(401, call("/auth/login", Map.of("identifier", user.getEmail(), "password", OLD), null).statusCode());
        assertEquals(200, call("/auth/login", Map.of("identifier", user.getEmail(), "password", NEW), null).statusCode());
    }
    @Test void wrongCurrentSameNewAndInvalidPasswordsDoNotMutateAccount() throws Exception {
        assertCode(400, 40099, change("WrongPassword123", NEW, tokens.accessToken()));
        assertCode(409, 40999, change(OLD, OLD, tokens.accessToken()));
        assertEquals(400, change(OLD, "short", tokens.accessToken()).statusCode());
        assertCode(422, 42299, change(OLD, "a1"+"漢".repeat(24), tokens.accessToken()));
        unchanged();
    }
    @Test void requiresAuthenticationAndRejectsGoogleOnlyOperatorsAndDisabledUsers() throws Exception {
        assertEquals(401, change(OLD, NEW, null).statusCode());
        for (var role : List.of(UserRole.ADMIN, UserRole.STAFF)) {
            String token = tx.execute(s -> jwt.issueTokens(account(role, AuthProvider.LOCAL, true)).accessToken());
            assertEquals(403, change(OLD, NEW, token).statusCode());
        }
        String google = tx.execute(s -> jwt.issueTokens(account(UserRole.USER, AuthProvider.GOOGLE, true)).accessToken());
        assertCode(403, 40399, change(OLD, NEW, google));
        String disabled = tx.execute(s -> jwt.issueTokens(account(UserRole.USER, AuthProvider.LOCAL, false)).accessToken());
        assertEquals(403, change(OLD, NEW, disabled).statusCode());
        unchanged();
    }
    @Test void linkedGoogleAccountCanChangeExistingLocalPassword() throws Exception {
        tx.executeWithoutResult(s -> {var u=users.findById(userId).orElseThrow(); u.setAuthProvider(AuthProvider.BOTH); users.saveAndFlush(u);});
        assertEquals(200, change(OLD, NEW, tokens.accessToken()).statusCode());
    }
    @Test void limitsWrongCurrentPasswordAttempts() throws Exception {
        for(int i=0;i<5;i++) assertCode(400, 40099, change("WrongPassword123", NEW, tokens.accessToken()));
        assertCode(429, 42999, change(OLD, NEW, tokens.accessToken()));
        unchanged();
    }
}
