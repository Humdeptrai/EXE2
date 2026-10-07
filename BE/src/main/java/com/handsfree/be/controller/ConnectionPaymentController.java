package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.dto.request.ConnectionPaymentRequest;
import com.handsfree.be.dto.response.ConnectionPaymentResponse;
import com.handsfree.be.service.ConnectionPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matches/{matchId}/payment")
@RequiredArgsConstructor
@Tag(name = "7. Connection Payment", description = "Wallet-backed matching fees and contact unlock")
public class ConnectionPaymentController {
    private final ConnectionPaymentService connectionPaymentService;

    @GetMapping
    @Operation(summary = "Get or initialize the connection payment for a match")
    public ResponseEntity<ApiResponse<ConnectionPaymentResponse>> getPayment(
            Authentication authentication,
            @PathVariable UUID matchId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Lấy thông tin phí kết nối thành công",
                connectionPaymentService.getPayment(currentUserId(authentication), matchId)
        ));
    }

    @PostMapping("/pay")
    @Operation(summary = "Debit the wallet once; unlock contact/chat after both participants pay")
    public ResponseEntity<ApiResponse<ConnectionPaymentResponse>> pay(
            Authentication authentication,
            @PathVariable UUID matchId,
            @Valid @RequestBody ConnectionPaymentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                200,
                "Ghi nhận thanh toán phí kết nối thành công",
                connectionPaymentService.pay(currentUserId(authentication), matchId, request.paymentMethod())
        ));
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }
}
