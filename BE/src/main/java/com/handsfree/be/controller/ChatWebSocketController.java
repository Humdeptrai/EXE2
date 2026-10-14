package com.handsfree.be.controller;

import com.handsfree.be.dto.request.ChatSendMessageRequest;
import com.handsfree.be.dto.response.ChatSocketErrorResponse;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {
    private final ChatService chatService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatSendMessageRequest request, Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        chatService.sendMessage(currentUserId, request);
    }

    @MessageExceptionHandler(AppException.class)
    @SendToUser("/queue/chat-errors")
    public ChatSocketErrorResponse handleAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        return new ChatSocketErrorResponse(errorCode.getCode(), errorCode.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser("/queue/chat-errors")
    public ChatSocketErrorResponse handleUnexpectedException(Exception exception) {
        ErrorCode errorCode = ErrorCode.INTERNAL_ERROR;
        return new ChatSocketErrorResponse(errorCode.getCode(), errorCode.getMessage());
    }
}
