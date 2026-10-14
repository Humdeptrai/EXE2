package com.handsfree.be.service;
import java.util.Set;
import java.util.UUID;
public interface ChatPresenceService { Set<UUID> onlineCounterparts(UUID user); }
