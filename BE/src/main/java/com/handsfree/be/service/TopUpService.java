package com.handsfree.be.service;

import com.handsfree.be.entity.WalletTopUp;
import tools.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.UUID;

public interface TopUpService {
    WalletTopUp create(UUID owner, BigDecimal amount, UUID requestId);
    WalletTopUp refresh(UUID owner, long code);
    void webhook(JsonNode body);
}
