package com.handsfree.be.dto.response;

import java.util.UUID;

public record JobCategoryResponse(
        UUID id,
        String code,
        String name,
        String description,
        String icon
) {
}
