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
                var user=users.findByIdAndActiveTrue(UUID.fromString(a.getName())).orElse(null);
                if (user!=null && a instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken token) {
                    Number version=token.getToken().getClaim("tokenVersion");
                    if((version==null?0:version.intValue())!=user.getTokenVersion()) {
                        res.setStatus(401);res.setContentType("application/json");res.getWriter().write("{\"code\":40100,\"message\":\"Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.\"}");return;
                    }
                }
                if (user==null) {
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
