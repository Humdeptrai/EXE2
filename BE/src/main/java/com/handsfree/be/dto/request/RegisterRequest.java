package com.handsfree.be.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        @Size(max = 254)
        @Pattern(
                regexp = "(^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$)",
                message = "Email không hợp lệ"
        )
        String identifier,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$",
                message = "Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số"
        )
        String password,

        @AssertTrue(message = "Bạn cần đồng ý với Điều khoản & Chính sách")
        boolean termsAccepted,

        @Size(max = 6) String emailOtp
) {}
