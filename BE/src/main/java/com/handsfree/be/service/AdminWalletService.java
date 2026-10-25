package com.handsfree.be.service;
import java.util.UUID;
import java.math.BigDecimal;
public interface AdminWalletService {
 record Credit(UUID requestId,BigDecimal amount,String reason,Long orderCode,UUID reportId) {}
 record Receipt(UUID requestId,UUID ownerId,BigDecimal amount,BigDecimal balanceAfter,Long orderCode) {}
 Receipt credit(UUID actor,UUID user,Credit request);
}
