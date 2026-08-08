package com.handsfree.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateUserProfileRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 100, message = "Họ tên tối đa 100 ký tự")
        String fullName,

        @Pattern(regexp = "^$|^0\\d{9}$", message = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0")
        String phone,

        @Size(max = 500, message = "URL ảnh đại diện tối đa 500 ký tự")
        @Pattern(regexp = "^$|^https?://.+", message = "Ảnh đại diện phải là URL http hoặc https")
        String avatarUrl,

        @Size(max = 500, message = "Giới thiệu tối đa 500 ký tự")
        String bio,

        @Size(max = 120, message = "Khu vực tối đa 120 ký tự")
        String location,

        @Size(max = 8, message = "Chỉ được chọn tối đa 8 đặc điểm")
        List<@NotBlank(message = "Đặc điểm không được để trống")
                @Size(max = 40, message = "Mỗi đặc điểm tối đa 40 ký tự") String> tags
) {
}
