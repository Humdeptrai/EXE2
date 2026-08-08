package com.handsfree.be.dto.response;

public record ChatSocketEventResponse(
        String type,
        ChatMessageResponse message
) {
    public static ChatSocketEventResponse message(ChatMessageResponse message) {
        return new ChatSocketEventResponse("MESSAGE", message);
    }
}
