package com.handsfree.be.service;

import java.util.UUID;

public interface PasswordChangeService {
    void change(UUID userId, int tokenVersion, String currentPassword, String newPassword);
}
