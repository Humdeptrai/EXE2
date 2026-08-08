package com.handsfree.be.security;

import com.handsfree.be.dto.response.TokenResponse;
import com.handsfree.be.entity.RefreshToken;
import com.handsfree.be.entity.User;
import com.handsfree.be.properties.JwtProperties;
import com.handsfree.be.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class JwtService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;
    private final RefreshTokenRepository refreshTokenRepository;

    public TokenResponse issueTokens(User user) {
        refreshTokenRepository.deleteAllByUserId(user.getId());

        Instant now = Instant.now();
        Instant accessExpiresAt = now.plus(properties.accessTokenMinutes(), ChronoUnit.MINUTES);
        String accessToken = generateAccessToken(user, now, accessExpiresAt);
        String refreshToken = generateOpaqueToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(TokenHash.sha256(refreshToken))
                .expiresAt(now.plus(properties.refreshTokenDays(), ChronoUnit.DAYS))
                .build());

        return new TokenResponse(
                accessToken,
                refreshToken,
                "Bearer",
                ChronoUnit.SECONDS.between(now, accessExpiresAt)
        );
    }

    private String generateAccessToken(User user, Instant issuedAt, Instant expiresAt) {
        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("type", "access")
                .claim("role", user.getRole().name())
                .claim("fullName", user.getFullName());
        if (user.getEmail() != null) {
            claimsBuilder.claim("email", user.getEmail());
        }
        if (user.getPhone() != null) {
            claimsBuilder.claim("phone", user.getPhone());
        }

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claimsBuilder.build())).getTokenValue();
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
