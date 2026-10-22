package com.handsfree.be.diagnostics;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class PerformanceTraceFilter extends OncePerRequestFilter {
    private static final org.slf4j.Logger LOG = LoggerFactory.getLogger(PerformanceTraceFilter.class);
    @Value("${PERFORMANCE_TRACE_ENABLED:true}")
    private boolean enabled;

    private String operation(HttpServletRequest request) {
        String path = request.getRequestURI();
        if ("GET".equals(request.getMethod())) {
            if (path.equals("/api/v1/identity/me")) return "identity.me";
            if (path.equals("/api/v1/identity/eligibility")) return "identity.eligibility";
            if (path.equals("/api/v1/identity/progress")) return "identity.progress";
            if (path.equals("/api/v1/identity/me/selfie") || path.matches("/api/v1/identity/(me|progress)/images/(face|selfie|front|back)")) return "identity.image";
            if (path.matches("/api/v1/conversations/[^/]+/messages/[^/]+/attachment")) return "chat.download";
        }
        if ("POST".equals(request.getMethod()) && path.matches("/api/v1/conversations/[^/]+/messages")
                && request.getContentType() != null && request.getContentType().startsWith("multipart/form-data")) return "chat.upload";
        return null;
    }

    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String operation = enabled ? operation(request) : null;
        if (operation == null) { chain.doFilter(request, response); return; }
        String previous = MDC.get(PerformanceTrace.KEY);
        String id = UUID.randomUUID().toString();
        MDC.put(PerformanceTrace.KEY, id);
        response.setHeader("X-Performance-Request-Id", id);
        long start = System.nanoTime();
        boolean failed = false;
        try { chain.doFilter(request, response); }
        catch (IOException | ServletException | RuntimeException | Error error) { failed = true; throw error; }
        finally {
            LOG.info("HF_PERF requestId={} operation={} stage=http.total status={} outcome={} elapsedMs={}",
                id, operation, response.getStatus(), failed ? "error" : "completed", (System.nanoTime() - start) / 1_000_000);
            if (previous == null) MDC.remove(PerformanceTrace.KEY); else MDC.put(PerformanceTrace.KEY, previous);
        }
    }
}
