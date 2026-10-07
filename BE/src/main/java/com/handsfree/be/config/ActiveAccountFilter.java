package com.handsfree.be.config;

import com.handsfree.be.repository.UserRepository;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@RequiredArgsConstructor
public class ActiveAccountFilter extends OncePerRequestFilter {
    private final UserRepository users;

    @Override
    protected void doFilterInternal(
            HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.isAuthenticated() && !"anonymousUser".equals(a.getName())) {
            try {
                if (users.findByIdAndActiveTrue(UUID.fromString(a.getName())).isEmpty()) {
                    res.setStatus(403);
                    res.setContentType("application/json");
                    res.getWriter()
                            .write("{\"code\":40301,\"message\":\"Tài khoản đã bị vô hiệu hóa\"}");
                    return;
                }
            } catch (IllegalArgumentException e) {
                res.sendError(401);
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
