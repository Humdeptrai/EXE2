package com.handsfree.be.controller;
import com.handsfree.be.service.PasswordResetService;
import com.handsfree.be.base.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
@RestController @RequestMapping("/api/v1/auth/password") @RequiredArgsConstructor
public class PasswordResetController {
 private final PasswordResetService passwords;
 public record Forgot(@NotBlank @Email @Size(max=150) String email) {}
 public record Reset(@NotBlank @Size(max=100) String token,@NotBlank @Pattern(regexp="^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",message="Mật khẩu cần 8–72 ký tự, gồm chữ và số") String password) {}
 @PostMapping("/forgot") public ApiResponse<?> forgot(@Valid @RequestBody Forgot request){passwords.request(request.email());return ApiResponse.success(200,"Nếu email thuộc tài khoản dùng mật khẩu và đủ điều kiện, hướng dẫn đặt lại sẽ được gửi. Hãy kiểm tra cả thư rác. Tài khoản Google tiếp tục dùng Đăng nhập Google.",null);}
 @PostMapping("/reset") public ApiResponse<?> reset(@Valid @RequestBody Reset request){passwords.reset(request.token(),request.password());return ApiResponse.success(200,"Đã đặt lại mật khẩu. Vui lòng đăng nhập lại trên các thiết bị.",null);}
}
