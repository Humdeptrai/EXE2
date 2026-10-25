package com.handsfree.be.config;

import com.handsfree.be.properties.CorsProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @org.springframework.beans.factory.annotation.Qualifier("chatHeartbeatScheduler")
    private final org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler chatHeartbeatScheduler;
    private final CorsProperties corsProperties;
    private final WebSocketAuthChannelInterceptor authChannelInterceptor;

    public WebSocketConfig(CorsProperties corsProperties, WebSocketAuthChannelInterceptor authChannelInterceptor,
            @org.springframework.beans.factory.annotation.Qualifier("chatHeartbeatScheduler") org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler scheduler) {
        this.corsProperties = corsProperties; this.authChannelInterceptor = authChannelInterceptor; this.chatHeartbeatScheduler = scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue").setTaskScheduler(chatHeartbeatScheduler).setHeartbeatValue(new long[]{10000,10000});
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] allowedOrigins = corsProperties.allowedOrigins() == null
                ? new String[0]
                : corsProperties.allowedOrigins().toArray(String[]::new);
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.interceptors(new org.springframework.messaging.support.ChannelInterceptor() {
            @Override public org.springframework.messaging.Message<?> preSend(org.springframework.messaging.Message<?> message,org.springframework.messaging.MessageChannel channel){return authChannelInterceptor.outbound(message);}
        });
    }
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authChannelInterceptor);
    }
}
