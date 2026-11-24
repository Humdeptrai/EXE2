package com.handsfree.be.matching;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.security.JwtService;
import com.handsfree.be.service.PlatformSettingsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=HandsFreeApplication.class, webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
    "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:matching-policy;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
    "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
class MatchingRequirementsHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired PlatformSettingsRepository settings;
    @Autowired IdentityRepository identities;
    @Autowired AdminAuditRepository audit;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired TransactionTemplate tx;
    // The real production initializer uses PostgreSQL ON CONFLICT; this test uses H2.
    @MockitoBean PlatformSettingsService settingsService;
    final HttpClient client=HttpClient.newHttpClient();

    String account(UserRole role) {
        return tx.execute(s -> jwt.issueTokens(users.saveAndFlush(User.builder().fullName("Synthetic new user")
            .role(role).active(true).authProvider(AuthProvider.LOCAL).currentMode(UserMode.CONSUMER).build())).accessToken());
    }
    HttpResponse<String> call(String method,String path,String body,String token) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path)).header("Content-Type","application/json");
        if(token!=null)request.header("Authorization","Bearer "+token);
        return client.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
    }
    @Test void onlyAdminCanToggleAndEligibilityChangesWithoutVerifyingOrChangingFees() throws Exception {
        tx.executeWithoutResult(status -> {
            var s=new PlatformSettings();s.setId(1);s.setConsumerFee(BigDecimal.valueOf(10000));s.setProviderFee(BigDecimal.valueOf(5000));
            s.setMinTopUp(10000);s.setMaxTopUp(5000000);s.setTopUpEnabled(true);settings.saveAndFlush(s);
        });
        when(settingsService.get()).thenAnswer(invocation -> settings.findById(1).orElseThrow());
        String admin=account(UserRole.ADMIN), user=account(UserRole.USER), staff=account(UserRole.STAFF);
        String off="{\"matchingRequirementsEnabled\":false}";
        assertEquals(401,call("PATCH","/admin/settings/matching",off,null).statusCode());
        assertEquals(403,call("PATCH","/admin/settings/matching",off,user).statusCode());
        assertEquals(403,call("PATCH","/admin/settings/matching",off,staff).statusCode());
        assertEquals(400,call("PATCH","/admin/settings/matching","{}",admin).statusCode());
        var before=call("GET","/identity/eligibility",null,user);assertEquals(200,before.statusCode(),before.body());
        assertFalse(json.readTree(before.body()).path("result").path("eligible").asBoolean());
        var changed=call("PATCH","/admin/settings/matching",off,admin);assertEquals(200,changed.statusCode(),changed.body());
        var result=json.readTree(call("GET","/identity/eligibility",null,user).body()).path("result");
        assertTrue(result.path("eligible").asBoolean());assertFalse(result.path("identityVerified").asBoolean());
        assertFalse(result.path("profileComplete").asBoolean());assertFalse(result.path("matchingRequirementsEnabled").asBoolean());
        assertEquals(0,identities.count());
        assertEquals(10000,settings.findById(1).orElseThrow().getConsumerFee().intValue());
        assertEquals(5000,settings.findById(1).orElseThrow().getProviderFee().intValue());
        assertEquals(200,call("PATCH","/admin/settings/matching","{\"matchingRequirementsEnabled\":true}",admin).statusCode());
        assertFalse(json.readTree(call("GET","/identity/eligibility",null,user).body()).path("result").path("eligible").asBoolean());
        assertEquals(2,audit.findAll().stream().filter(a -> "MATCHING_REQUIREMENTS_SETTINGS".equals(a.getAction())).count());
    }
}
