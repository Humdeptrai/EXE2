package com.handsfree.be.service;

import com.handsfree.be.exception.ErrorCode;
public interface RegistrationEmailService {
    record Policy(boolean emailOtpRequired) {}
    record Delivery(int expiresInSeconds, int resendAfterSeconds) {}
    Policy policy();
    Delivery send(String email);
    // Caller must commit a returned validation failure to persist the attempt count.
    ErrorCode consume(String email, String code);
}
