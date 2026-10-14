package com.handsfree.be.serviceImpl;

import com.handsfree.be.repository.WalletTopUpRepository;
import com.handsfree.be.service.TopUpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TopUpReconciliationScheduler {
    private final WalletTopUpRepository orders;
    private final TopUpService topUps;
    private final PayosGateway gateway;
    private long cursor;

    // A dedicated scheduler keeps gateway timeouts from delaying matching refunds.
    @Scheduled(scheduler = "walletReconciliationScheduler", initialDelay = 30000,
            fixedDelayString = "${app.wallet-reconcile-delay-ms:60000}")
    public void sweep() {
        if (!gateway.configured()) return;
        var batch = orders.findUncreditedAfter(cursor, PageRequest.of(0, 10));
        if (batch.isEmpty()) {
            cursor = 0;
            batch = orders.findUncreditedAfter(cursor, PageRequest.of(0, 10));
        }
        for (var order : batch) {
            cursor = order.getOrderCode();
            try { topUps.refresh(order.getOwnerId(), order.getOrderCode()); }
            catch (RuntimeException error) {
                // Rotate past failures so an old invalid order cannot starve later payments.
                log.warn("Top-up retry deferred: orderCode={}", order.getOrderCode());
            }
        }
    }
}
