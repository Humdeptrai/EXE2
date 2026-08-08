package com.handsfree.be.dto.response;

import com.handsfree.be.constant.InterestLevel;
import com.handsfree.be.constant.InterestStatus;

public record JobInteractionStateResponse(
        boolean saved,
        InterestLevel interestLevel,
        InterestStatus interestStatus,
        boolean skipped
) {
}
