package com.handsfree.be.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {
    private static final Set<String> ALLOWED_SUBSCRIPTIONS = Set.of(
            "/user/queue/chat", "/user/queue/chat-errors", "/user/queue/notifications"
    );
    private final JwtDecoder jwtDecoder;

    public WebSocketAuthChannelInterceptor(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        // Spring also generates DISCONNECT during session cleanup, without a Principal.
        // It carries no application data and must be allowed even after CONNECT fails.
        if (accessor != null && StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            return message;
        }
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authorization = accessor.getFirstNativeHeader("Authorization");
            if (!StringUtils.hasText(authorization)) {
                authorization = accessor.getFirstNativeHeader("authorization");
            }
            String token = bearerToken(authorization);
            try {
                Jwt jwt = jwtDecoder.decode(token);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(jwt.getSubject(), token, List.of());
                accessor.setUser(authentication);
            } catch (JwtException exception) {
                throw new IllegalArgumentException("Invalid WebSocket access token", exception);
            }
        }
        if (accessor != null && accessor.getCommand() != null
                && !StompCommand.CONNECT.equals(accessor.getCommand())) {
            if (!(accessor.getUser() instanceof Authentication authentication)
                    || !authentication.isAuthenticated()) {
                throw new IllegalArgumentException("Unauthenticated WebSocket frame");
            }
            StompCommand command = accessor.getCommand();
            if (StompCommand.SUBSCRIBE.equals(command)) {
                if (accessor.getDestination() == null
                        || !ALLOWED_SUBSCRIPTIONS.contains(accessor.getDestination())) {
                    throw new IllegalArgumentException("WebSocket subscription is not allowed");
                }
            } else if (StompCommand.SEND.equals(command)) {
                if (!"/app/chat.send".equals(accessor.getDestination())) {
                    throw new IllegalArgumentException("WebSocket destination is not allowed");
                }
            } else if (!Set.of(StompCommand.DISCONNECT, StompCommand.UNSUBSCRIBE,
                    StompCommand.ACK, StompCommand.NACK).contains(command)) {
                throw new IllegalArgumentException("WebSocket command is not allowed");
            }
        }
        return message;
    }

    private String bearerToken(String authorization) {
        if (!StringUtils.hasText(authorization) || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Missing WebSocket Bearer token");
        }
        String token = authorization.substring(7).trim();
        if (!StringUtils.hasText(token)) {
            throw new IllegalArgumentException("Missing WebSocket Bearer token");
        }
        return token;
    }
}
