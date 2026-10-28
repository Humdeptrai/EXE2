package com.handsfree.be.management;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.User;
import com.handsfree.be.repository.UserRepository;
import com.handsfree.be.security.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes=HandsFreeApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:operator-lists;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
    "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class OperatorListsHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired TransactionTemplate tx;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    String adminToken,userToken,staffToken;
    final String[] endpoints={"/admin/users","/staff/jobs","/admin/matches","/admin/topups","/admin/ledger","/admin/audit",
            "/staff/reports","/staff/identities","/admin/identity-appeals","/admin/profile-skills"};
    User account(String name,UserRole role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@example.invalid").fullName(name)
                .role(role).authProvider(AuthProvider.LOCAL).currentMode(UserMode.CONSUMER).build());
    }
    @BeforeAll void setup() {
        tx.executeWithoutResult(s->{
            adminToken=jwt.issueTokens(account("Operator",UserRole.ADMIN)).accessToken();
            staffToken=jwt.issueTokens(account("Staff",UserRole.STAFF)).accessToken();
            userToken=jwt.issueTokens(account("Member",UserRole.USER)).accessToken();
            for(int i=0;i<57;i++)account("Paging fixture "+i,UserRole.USER);
            for(int i=0;i<23;i++)account("TwentyThree fixture "+i,UserRole.USER);
        });
    }
    HttpResponse<String> get(String path,String token)throws Exception {
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path));
        if(token!=null)b.header("Authorization","Bearer "+token);
        return HttpClient.newHttpClient().send(b.GET().build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void allOperatorListsHonorEveryOfferedSize()throws Exception {
        for(String path:endpoints)for(int size:new int[]{5,10,15,30,50,100}){
            var r=get(path+"?size="+size,adminToken);assertEquals(200,r.statusCode(),path+" "+r.body());
            var page=json.readTree(r.body()).path("result");assertEquals(size,page.path("size").asInt(),path);
            assertTrue(page.path("content").size()<=size,path);
        }
    }
    @Test void twentyThreeUsersSplitExactlyForEachOfferedSize()throws Exception {
        for(int size:new int[]{5,10,15,30,50,100}) {
            Set<String> seen=new HashSet<>();int expectedPages=(23+size-1)/size;
            for(int page=0;page<expectedPages;page++) {
                var r=get("/admin/users?size="+size+"&search=TwentyThree%20fixture&page="+page,adminToken);
                assertEquals(200,r.statusCode(),r.body());var result=json.readTree(r.body()).path("result");
                assertEquals(23,result.path("totalElements").asInt());assertEquals(expectedPages,result.path("totalPages").asInt());
                assertEquals(Math.min(size,23-page*size),result.path("content").size());
                assertEquals(page==expectedPages-1,result.path("last").asBoolean());
                for(var row:result.path("content"))assertTrue(seen.add(row.path("id").asString()));
            }
            assertEquals(23,seen.size());
        }
    }
    @Test void unsupportedSizesAreRejectedAcrossAllLists()throws Exception {
        for(String path:endpoints)for(int size:new int[]{0,-1,51,1000000}){
            var r=get(path+"?size="+size,adminToken);assertEquals(400,r.statusCode(),path+" "+r.body());
        }
    }
    @Test void pagingDoesNotLoseOrRepeatAccountsAndFiltersKeepTotals()throws Exception {
        Set<String> ids=new HashSet<>();int pages=0;long total=0;
        do {
            var r=get("/admin/users?size=5&search=Paging%20fixture&page="+pages,adminToken);assertEquals(200,r.statusCode(),r.body());
            var page=json.readTree(r.body()).path("result");total=page.path("totalElements").asLong();
            for(var row:page.path("content"))assertTrue(ids.add(row.path("id").asString()),"Repeated account");
            pages++;if(page.path("last").asBoolean())break;
        }while(pages<20);
        assertEquals(57,total);assertEquals(57,ids.size());assertEquals(12,pages);
    }
    @Test void omittedPageSizeDefaultsToTen()throws Exception {
        var r=get("/admin/users",adminToken);assertEquals(200,r.statusCode(),r.body());
        assertEquals(10,json.readTree(r.body()).path("result").path("size").asInt());
    }
    @Test void presenceIsAdminOnlyAndReturnsSnapshot()throws Exception {
        assertEquals(401,get("/admin/presence",null).statusCode());
        assertEquals(403,get("/admin/presence",userToken).statusCode());
        assertEquals(403,get("/admin/presence",staffToken).statusCode());
        var r=get("/admin/presence",adminToken);assertEquals(200,r.statusCode(),r.body());
        var snapshot=json.readTree(r.body()).path("result");assertEquals(0,snapshot.path("onlineUsers").asInt());
        assertFalse(snapshot.path("observedAt").asString().isBlank());
    }
    static class StompListener implements java.net.http.WebSocket.Listener {
        final java.util.concurrent.CompletableFuture<Void> connected=new java.util.concurrent.CompletableFuture<>();
        final StringBuilder buffer=new StringBuilder();
        @Override public void onOpen(java.net.http.WebSocket ws) { ws.request(1); }
        @Override public java.util.concurrent.CompletionStage<?> onText(java.net.http.WebSocket ws,CharSequence data,boolean last) {
            buffer.append(data);
            if(last) { if(buffer.toString().contains("CONNECTED"))connected.complete(null); buffer.setLength(0); }
            ws.request(1);return null;
        }
        @Override public void onError(java.net.http.WebSocket ws,Throwable error) { connected.completeExceptionally(error); }
    }
    java.net.http.WebSocket connect(String token)throws Exception {
        var listener=new StompListener();
        var ws=HttpClient.newHttpClient().newWebSocketBuilder().buildAsync(URI.create("ws://localhost:"+port+"/ws"),listener).get();
        ws.sendText("CONNECT\naccept-version:1.2\nAuthorization:Bearer "+token+"\nheart-beat:0,0\n\n\0",true).join();
        listener.connected.get(5,java.util.concurrent.TimeUnit.SECONDS);
        ws.sendText("SUBSCRIBE\nid:presence-test\ndestination:/user/queue/notifications\n\n\0",true).join();
        return ws;
    }
    void awaitCount(long expected)throws Exception {
        long deadline=System.nanoTime()+java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
        long actual=-1;
        while(System.nanoTime()<deadline) {
            actual=json.readTree(get("/admin/presence",adminToken).body()).path("result").path("onlineUsers").asLong();
            if(actual==expected)return;
            Thread.sleep(25);
        }
        assertEquals(expected,actual);
    }
    @Test void realAuthenticatedWebSocketsCountAccountsAndDisconnects()throws Exception {
        java.net.http.WebSocket a=null,b=null,c=null;
        try {
            a=connect(userToken);awaitCount(1);
            b=connect(userToken);awaitCount(1);
            c=connect(staffToken);awaitCount(2);
            a.abort();a=null;awaitCount(2);
            b.abort();b=null;awaitCount(1);
            c.abort();c=null;awaitCount(0);
        } finally { if(a!=null)a.abort();if(b!=null)b.abort();if(c!=null)c.abort(); }
    }
    @Test void existingAccountTotalRemainsVisible()throws Exception {
        var r=get("/admin/analytics",adminToken);assertEquals(200,r.statusCode(),r.body());
        assertEquals(users.count(),json.readTree(r.body()).path("result").path("users").asLong());
    }
}
