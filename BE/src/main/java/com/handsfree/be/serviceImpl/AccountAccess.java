package com.handsfree.be.serviceImpl;

import com.handsfree.be.constant.UserRole;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountAccess {
    private final UserRepository users;

    public User active(UUID id) {
        return users.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_DISABLED));
    }

    public User operator(UUID id, boolean adminOnly) {
        User u = active(id);
        if (u.getRole() != UserRole.ADMIN && (adminOnly || u.getRole() != UserRole.STAFF))
            throw new AppException(ErrorCode.FORBIDDEN);
        return u;
    }
}
