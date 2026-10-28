package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import java.util.Set;

/** Shared limits for operator lists; 20 remains accepted for compatibility with older clients. */
public final class OperatorPageSize {
    private OperatorPageSize() {}
    public static int require(int size) {
        if (!Set.of(5, 10, 15, 20, 30, 50, 100).contains(size))
            throw new AppException(ErrorCode.VALIDATION_FAILED);
        return size;
    }
}
