package com.handsfree.be.management;

import com.handsfree.be.serviceImpl.AccountAccess;
import com.handsfree.be.serviceImpl.OnlineUserServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.*;
import java.security.Principal;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OnlineUserServiceTest {
    final AccountAccess access=mock(AccountAccess.class);
    final OnlineUserServiceImpl presence=new OnlineUserServiceImpl(access);
    final UUID admin=UUID.randomUUID();
    void subscribe(String session,UUID user,String destination) {
        var h=StompHeaderAccessor.create(StompCommand.SUBSCRIBE);h.setSessionId(session);h.setDestination(destination);
        Principal p=user==null?null:()->user.toString();h.setUser(p);
        presence.subscribed(new SessionSubscribeEvent(this,MessageBuilder.createMessage(new byte[0],h.getMessageHeaders()),p));
    }
    void disconnect(String session) {
        var h=StompHeaderAccessor.create(StompCommand.DISCONNECT);h.setSessionId(session);
        presence.disconnected(new SessionDisconnectEvent(this,MessageBuilder.createMessage(new byte[0],h.getMessageHeaders()),session,CloseStatus.NORMAL));
    }
    @Test void multipleTabsAndChatConnectionsCountOneAccount() {
        UUID user=UUID.randomUUID();subscribe("tab1",user,"/user/queue/notifications");subscribe("tab2",user,"/user/queue/chat");
        assertEquals(1,presence.snapshot(admin).onlineUsers());disconnect("tab1");assertEquals(1,presence.snapshot(admin).onlineUsers());
        disconnect("tab2");assertEquals(0,presence.snapshot(admin).onlineUsers());
    }
    @Test void uniqueAccountsAndRepeatedSubscriptionsAreCountedCorrectly() {
        UUID first=UUID.randomUUID();subscribe("a",first,"/user/queue/notifications");subscribe("a",first,"/user/queue/notifications");
        subscribe("b",UUID.randomUUID(),"/user/queue/notifications");assertEquals(2,presence.snapshot(admin).onlineUsers());
        disconnect("unknown");assertEquals(2,presence.snapshot(admin).onlineUsers());
    }
    @Test void anonymousAndUnrelatedSubscriptionsDoNotCount() {
        subscribe("anonymous",null,"/user/queue/notifications");subscribe("unrelated",UUID.randomUUID(),"/unrelated");
        assertEquals(0,presence.snapshot(admin).onlineUsers());
    }
    @Test void everySnapshotChecksAdminAccess() {
        presence.snapshot(admin);verify(access).operator(admin,true);
    }
}
