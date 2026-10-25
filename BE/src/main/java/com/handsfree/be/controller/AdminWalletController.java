package com.handsfree.be.controller;
import com.handsfree.be.service.AdminWalletService;
import com.handsfree.be.base.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/admin/users") @RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminWalletController {
 private final AdminWalletService wallet;
 @PostMapping("/{user}/wallet-credits") public ApiResponse<?> credit(Authentication a,@PathVariable UUID user,@RequestBody AdminWalletService.Credit request){return ApiResponse.success(200,"Đã cộng tiền vào ví và ghi lịch sử",wallet.credit(UUID.fromString(a.getName()),user,request));}
}
