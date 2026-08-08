package com.handsfree.be.security;

import com.handsfree.be.dto.response.GoogleProfile;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.properties.GoogleProperties;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class GoogleTokenVerifier {
    private final JwtDecoder googleJwtDecoder;
    private final GoogleProperties googleProperties;

    public GoogleTokenVerifier(
            @Qualifier("googleJwtDecoder") JwtDecoder googleJwtDecoder,
            GoogleProperties googleProperties
    ) {
        this.googleJwtDecoder = googleJwtDecoder;
        this.googleProperties = googleProperties;
    }

    public GoogleProfile verify(String credential) {
        if (googleProperties.allowedClientIds().isEmpty()) {
            throw new AppException(ErrorCode.GOOGLE_LOGIN_NOT_CONFIGURED);
        }

        try {
            Jwt jwt = googleJwtDecoder.decode(credential);
            String subject = jwt.getSubject();
            String email = jwt.getClaimAsString("email");
            String fullName = jwt.getClaimAsString("name");
            Boolean emailVerified = jwt.getClaim("email_verified");

            if (!StringUtils.hasText(subject) || !StringUtils.hasText(email) || !Boolean.TRUE.equals(emailVerified)) {
                throw new AppException(ErrorCode.INVALID_GOOGLE_TOKEN);
            }

            return new GoogleProfile(
                    subject,
                    email,
                    StringUtils.hasText(fullName) ? fullName : email,
                    true
            );
        } catch (JwtException exception) {
            throw new AppException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
    }
}
