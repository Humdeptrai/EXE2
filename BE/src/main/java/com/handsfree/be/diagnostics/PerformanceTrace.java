package com.handsfree.be.diagnostics;

import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import java.util.function.Supplier;

/** Timing only: never log arguments, payloads, identities or exception messages. */
public final class PerformanceTrace {
    public static final String KEY = "hfPerfRequest";
    private static final org.slf4j.Logger LOG = LoggerFactory.getLogger(PerformanceTrace.class);
    private PerformanceTrace() {}

    public static <T> T measure(String stage, Supplier<T> work) {
        if (MDC.get(KEY) == null) return work.get();
        long start = System.nanoTime();
        String outcome = "ok";
        try { return work.get(); }
        catch (RuntimeException | Error error) { outcome = "error"; throw error; }
        finally { LOG.info("HF_PERF requestId={} stage={} outcome={} elapsedMs={}",
            MDC.get(KEY), stage, outcome, (System.nanoTime() - start) / 1_000_000); }
    }
}
