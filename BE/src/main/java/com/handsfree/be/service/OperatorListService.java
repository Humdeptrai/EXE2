package com.handsfree.be.service;
import com.handsfree.be.dto.response.PageResponse;
import java.util.*;
/** Operator-only summaries; no document images or private OCR are included. */
public interface OperatorListService {
    PageResponse<Map<String,Object>> list(UUID actor, String panel, int page, String search, String state);
}
