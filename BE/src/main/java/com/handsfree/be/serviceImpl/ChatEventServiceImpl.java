package com.handsfree.be.serviceImpl;
import com.handsfree.be.service.ChatEventService;
import com.handsfree.be.dto.response.ChatSocketEventResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.*;
import java.util.UUID;
import static com.handsfree.be.diagnostics.PerformanceTrace.measure;
@Service @RequiredArgsConstructor @Slf4j
public class ChatEventServiceImpl implements ChatEventService {
    private final SimpMessagingTemplate messaging;
    public void publish(UUID consumer, UUID provider, ChatSocketEventResponse event) {
        Runnable publish = () -> {
            try {
                measure("chat.event.publish", () -> {
                messaging.convertAndSendToUser(consumer.toString(), "/queue/chat", event);
                if (!provider.equals(consumer)) messaging.convertAndSendToUser(provider.toString(), "/queue/chat", event);
                return null;
                });
            } catch (RuntimeException error) { log.warn("Chat event delivery failed: type={}", event.type()); }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                public void afterCommit() { publish.run(); }
            });
        else publish.run();
    }
}
