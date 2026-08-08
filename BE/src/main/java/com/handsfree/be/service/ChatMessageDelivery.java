package com.handsfree.be.service;

import com.handsfree.be.dto.response.ChatMessageResponse;

import java.util.UUID;

public record ChatMessageDelivery(
        ChatMessageResponse message,
        UUID consumerId,
        UUID providerId
) {}
