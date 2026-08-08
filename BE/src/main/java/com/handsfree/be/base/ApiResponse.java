package com.handsfree.be.base;

public record ApiResponse<T>(int code, String message, T result) {
    public static <T> ApiResponse<T> success(int code, String message, T result) {
        return new ApiResponse<>(code, message, result);
    }
}
