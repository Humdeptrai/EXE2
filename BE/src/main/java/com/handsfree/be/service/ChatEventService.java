package com.handsfree.be.service;
import com.handsfree.be.dto.response.ChatSocketEventResponse;
import java.util.UUID;
public interface ChatEventService {
    void publish(UUID consumer, UUID provider, ChatSocketEventResponse event);
}
