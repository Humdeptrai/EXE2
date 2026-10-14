package com.handsfree.be.dto.response;
import java.util.UUID;
public record ChatSocketEventResponse(String type, ChatMessageResponse message, UUID conversationId, UUID userId, Boolean online) {
    public static ChatSocketEventResponse message(ChatMessageResponse message) {
        return new ChatSocketEventResponse("MESSAGE", message, message.conversationId(), null, null);
    }
    public static ChatSocketEventResponse updated(ChatMessageResponse message) {
        return new ChatSocketEventResponse("MESSAGE_UPDATED", message, message.conversationId(), null, null);
    }
    public static ChatSocketEventResponse read(UUID conversationId, UUID reader) {
        return new ChatSocketEventResponse("READ", null, conversationId, reader, null);
    }
    public static ChatSocketEventResponse presence(UUID user, boolean online) {
        return new ChatSocketEventResponse("PRESENCE", null, null, user, online);
    }
}
