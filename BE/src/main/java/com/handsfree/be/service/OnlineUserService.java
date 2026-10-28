package com.handsfree.be.service;

import java.time.Instant;
import java.util.UUID;

public interface OnlineUserService {
    record Snapshot(long onlineUsers, Instant observedAt) {}
    Snapshot snapshot(UUID actor);
}
