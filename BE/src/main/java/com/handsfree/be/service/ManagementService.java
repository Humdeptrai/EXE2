package com.handsfree.be.service;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.entity.PlatformSettings;
import java.math.BigDecimal;
import java.util.UUID;
public interface ManagementService {
    void log(UUID actor, String action, String detail);
    void hideJob(UUID actor, UUID id, boolean hidden, String reason);
    void updateUser(UUID actor, UUID id, UserRole role, boolean active, String reason);
    PlatformSettings changeSettings(UUID actor, BigDecimal consumer, BigDecimal provider, long min, long max, boolean enabled, int paymentWindowMinutes, int ratingDelayMinutes);
    void refund(UUID actor, UUID matchId, String reason);
}
