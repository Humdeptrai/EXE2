package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.response.ChatConversationResponse;
import com.handsfree.be.dto.response.ChatMessageResponse;
import com.handsfree.be.dto.response.ChatReadResponse;
import com.handsfree.be.dto.response.PageResponse;
import com.handsfree.be.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
@Tag(name = "8. Realtime Chat", description = "Conversation history and realtime chat after both participants complete connection fees")
public class ChatController {
    private final ChatService chatService;

    @GetMapping
    @Operation(summary = "List conversations for the current user")
    public ResponseEntity<ApiResponse<PageResponse<ChatConversationResponse>>> getConversations(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy danh sách trò chuyện thành công",
                chatService.getConversations(currentUserId(authentication), page, size)
        ));
    }

    @GetMapping("/{conversationId}")
    @Operation(summary = "Get one participant conversation")
    public ResponseEntity<ApiResponse<ChatConversationResponse>> getConversation(
            Authentication authentication,
            @PathVariable UUID conversationId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy phòng trò chuyện thành công",
                chatService.getConversation(currentUserId(authentication), conversationId)
        ));
    }

    @PostMapping("/matches/{matchId}")
    @Operation(summary = "Open or create the chat room after both participants complete connection fees")
    public ResponseEntity<ApiResponse<ChatConversationResponse>> openMatchConversation(
            Authentication authentication,
            @PathVariable UUID matchId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Mở phòng trò chuyện thành công",
                chatService.getOrCreateConversation(currentUserId(authentication), matchId)
        ));
    }

    @GetMapping("/{conversationId}/messages")
    @Operation(summary = "Get message history, newest page first")
    public ResponseEntity<ApiResponse<PageResponse<ChatMessageResponse>>> getMessages(
            Authentication authentication,
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy lịch sử tin nhắn thành công",
                chatService.getMessages(currentUserId(authentication), conversationId, page, size)
        ));
    }

    @PostMapping("/{conversationId}/read")
    @Operation(summary = "Mark unread messages from the counterpart as read")
    public ResponseEntity<ApiResponse<ChatReadResponse>> markRead(
            Authentication authentication,
            @PathVariable UUID conversationId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Đã đánh dấu tin nhắn là đã đọc",
                chatService.markRead(currentUserId(authentication), conversationId)
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
