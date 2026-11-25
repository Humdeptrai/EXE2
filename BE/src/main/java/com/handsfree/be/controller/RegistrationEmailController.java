package com.handsfree.be.controller;

import com.handsfree.be.base.ApiResponse;
import com.handsfree.be.service.RegistrationEmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/auth/register") @RequiredArgsConstructor
public class RegistrationEmailController {
    private final RegistrationEmailService email;
    public record EmailRequest(@NotBlank @Email @Size(max=254) String email) {}
    @GetMapping("/policy") public ApiResponse<RegistrationEmailService.Policy> policy(){return ApiResponse.success(200,"Điều kiện đăng ký",email.policy());}
    @PostMapping("/email-otp") public ApiResponse<RegistrationEmailService.Delivery> send(@Valid @RequestBody EmailRequest request){return ApiResponse.success(200,"Đã gửi mã xác thực tới email",email.send(request.email()));}
}
