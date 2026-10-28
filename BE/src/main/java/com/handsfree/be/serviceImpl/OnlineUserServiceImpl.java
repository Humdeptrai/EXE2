package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.OnlineUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Authenticated connections on this server. Multiple tabs/devices count once. */
@Service @RequiredArgsConstructor
public class OnlineUserServiceImpl implements OnlineUserService {
    private final AccountAccess access;
    private final Map<String, UUID> sessions = new HashMap<>();
    @EventListener
    public synchronized void subscribed(SessionSubscribeEvent event) {
        var headers = StompHeaderAccessor.wrap(event.getMessage());
        if (event.getUser() == null || headers.getSessionId() == null
                || !Set.of("/user/queue/notifications", "/user/queue/chat").contains(headers.getDestination() == null ? "" : headers.getDestination())) return;
        try {
            sessions.put(headers.getSessionId(), UUID.fromString(event.getUser().getName()));
        } catch (IllegalArgumentException ignored) { /* Ignore non-account principals. */ }
    }
    @EventListener
    public synchronized void disconnected(SessionDisconnectEvent event) {
        sessions.remove(event.getSessionId());
    }
    @Override
    public Snapshot snapshot(UUID actor) {
        access.operator(actor, true);
        synchronized (this) {
            return new Snapshot(sessions.values().stream().distinct().count(), Instant.now());
        }
    }
}
