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
    private final com.handsfree.be.service.ChatPresenceService presence;

    @GetMapping("/unread-count")
    public ApiResponse<?> unread(Authentication a) { return ApiResponse.success(200, "Tin chưa đọc", java.util.Map.of("count", chatService.unreadCount(currentUserId(a)))); }
    @GetMapping("/presence")
    public ApiResponse<?> online(Authentication a) { return ApiResponse.success(200, "Đang hoạt động", presence.onlineCounterparts(currentUserId(a))); }

    public record HeartRequest(boolean liked) {}
    @org.springframework.web.bind.annotation.PutMapping("/{conversationId}/messages/{messageId}/heart")
    public ApiResponse<ChatMessageResponse> heart(Authentication a, @PathVariable UUID conversationId, @PathVariable UUID messageId,
            @org.springframework.web.bind.annotation.RequestBody HeartRequest body) {
        return ApiResponse.success(200, "Đã cập nhật cảm xúc", chatService.heart(currentUserId(a), conversationId, messageId, body.liked()));
    }
    public record SendRequest(UUID clientMessageId, String content) {}
    @PostMapping(value="/{conversationId}/messages", consumes="application/json")
    public ApiResponse<ChatMessageResponse> send(Authentication a, @PathVariable UUID conversationId,
            @org.springframework.web.bind.annotation.RequestBody SendRequest body) {
        return ApiResponse.success(200, "Đã gửi tin nhắn", chatService.sendMessage(currentUserId(a),
            new com.handsfree.be.dto.request.ChatSendMessageRequest(conversationId, body.clientMessageId(), body.content())).message());
    }
    @PostMapping(value="/{conversationId}/messages", consumes="multipart/form-data")
    public ApiResponse<ChatMessageResponse> upload(Authentication a, @PathVariable UUID conversationId,
            @RequestParam UUID clientMessageId, @RequestParam(defaultValue="") String content,
            @org.springframework.web.bind.annotation.RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        return ApiResponse.success(200, "Đã gửi tệp", chatService.sendAttachment(currentUserId(a), conversationId, clientMessageId, content, file));
    }
    @GetMapping("/{conversationId}/messages/{messageId}/attachment")
    public ResponseEntity<org.springframework.core.io.InputStreamResource> attachment(Authentication a,
            @PathVariable UUID conversationId, @PathVariable UUID messageId,
            @org.springframework.web.bind.annotation.RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        var file = chatService.attachment(currentUserId(a), conversationId, messageId, ifNoneMatch);
        var response = ResponseEntity.status(file.stream() == null ? 304 : 200)
                .header("Cache-Control", file.etag() == null ? "no-store" : "private, no-cache")
                .header("Vary", "Authorization").header("X-Content-Type-Options", "nosniff");
        if (file.etag() != null) response.eTag(file.etag());
        if (file.stream() == null) return response.build();
        String disposition = file.contentType().startsWith("image/") || file.contentType().startsWith("video/") ? "inline" : "attachment";
        return response.header("Content-Disposition", org.springframework.http.ContentDisposition.builder(disposition)
                    .filename(file.originalName(), java.nio.charset.StandardCharsets.UTF_8).build().toString())
                .contentType(org.springframework.http.MediaType.parseMediaType(file.contentType())).contentLength(file.sizeBytes())
                .body(new org.springframework.core.io.InputStreamResource(file.stream()));
    }

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
