package com.handsfree.be.serviceImpl;
import com.handsfree.be.repository.ChatConversationRepository;
import com.handsfree.be.service.ChatPresenceService;
import com.handsfree.be.service.ChatEventService;
import com.handsfree.be.dto.response.ChatSocketEventResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.socket.messaging.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@Service @RequiredArgsConstructor
public class ChatPresenceServiceImpl implements ChatPresenceService {
    private final ChatConversationRepository conversations;
    private final AccountAccess access;
    private final ChatEventService events;
    private final Map<String, UUID> sessions = new ConcurrentHashMap<>();
    private synchronized boolean online(UUID user) { return sessions.containsValue(user); }
    @EventListener
    public void subscribed(SessionSubscribeEvent event) {
        var headers = StompHeaderAccessor.wrap(event.getMessage());
        if (!"/user/queue/chat".equals(headers.getDestination()) || event.getUser() == null || headers.getSessionId() == null) return;
        UUID user = UUID.fromString(event.getUser().getName());
        boolean changed;
        synchronized (this) { changed = !online(user); sessions.put(headers.getSessionId(), user); }
        if (changed) broadcast(user, true);
    }
    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        UUID user; boolean changed;
        synchronized (this) { user = sessions.remove(event.getSessionId()); changed = user != null && !online(user); }
        if (changed) broadcast(user, false);
    }
    private void broadcast(UUID user, boolean status) {
        for (UUID other : counterparts(user)) events.publish(other, other, ChatSocketEventResponse.presence(user, status));
    }
    private Set<UUID> counterparts(UUID user) {
        var result = new HashSet<UUID>();
        for (var c : conversations.findAllForParticipant(user, Pageable.unpaged())) {
            var m = c.getJobMatch();
            result.add(m.getConsumer().getId().equals(user) ? m.getProvider().getId() : m.getConsumer().getId());
        }
        return result;
    }
    @Transactional(readOnly = true)
    public Set<UUID> onlineCounterparts(UUID user) {
        access.active(user);
        var result = counterparts(user); result.removeIf(other -> !online(other)); return result;
    }
}
