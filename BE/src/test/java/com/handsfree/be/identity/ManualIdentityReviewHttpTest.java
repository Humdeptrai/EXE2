package com.handsfree.be.identity;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.serviceImpl.IdentityCrypto;
import com.handsfree.be.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real HTTP/JWT/transactions on isolated H2. No production data or model calls. */
@SpringBootTest(classes=HandsFreeApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:manual-review;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
    "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
class ManualIdentityReviewHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired IdentityRepository identities;
    @Autowired IdentitySubmissionRepository submissions;
    @Autowired IdentityAppealRepository appeals;
    @Autowired IdentityRegistryLockRepository mutex;
    @Autowired IdentityCrypto crypto;
    @Autowired IdentityService service;
    @Autowired TransactionTemplate tx;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    UUID admin,user,existingOwner,appealId;
    String token;
    User account(UserRole role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@example.invalid").fullName("Synthetic person")
                .role(role).authProvider(AuthProvider.LOCAL).currentMode(UserMode.CONSUMER).build());
    }
    @BeforeEach void setup() {
        tx.executeWithoutResult(status->{
            var lock=new IdentityRegistryLock();lock.setId(1);mutex.saveAndFlush(lock);
            var a=account(UserRole.ADMIN);admin=a.getId();token=jwt.issueTokens(a).accessToken();
            var u=account(UserRole.USER);user=u.getId();u.setLocation("Synthetic location");
            u.setPhone("0"+String.format("%09d",Math.abs(UUID.randomUUID().getLeastSignificantBits()%1_000_000_000)));
            existingOwner=account(UserRole.USER).getId();
            var old=new IdentityVerification();old.setUserId(existingOwner);old.setStatus("VERIFIED");
            old.setDocumentNumber(crypto.encrypt("012345678901"));identities.saveAndFlush(old);
            var active=new IdentityVerification();active.setUserId(user);active.setStatus("REVIEW_REQUIRED");identities.saveAndFlush(active);
            var d=new IdentitySubmission();d.setUserId(user);d.setStatus("REVIEW_REQUIRED");
            d.setSubmittedAt(Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
            d.setFrontImage(crypto.encrypt(new byte[]{1}));d.setBackImage(crypto.encrypt(new byte[]{2}));
            d.setFaceImage(crypto.encrypt(new byte[]{3}));d.setSelfieImage(crypto.encrypt(new byte[]{4}));
            d.setDocumentNumber(crypto.encrypt("012345678901"));d.setFullName(crypto.encrypt("Synthetic Name"));
            d.setLive(false);d.setSimilarity(.0);d.setDocumentData(crypto.encrypt("OCR failed; duplicate face and CCCD"));
            submissions.saveAndFlush(d);
            var appeal=new IdentityAppeal();appeal.setUserId(user);appeal.setStatus("REQUESTED");
            appeal.setCreatedAt(Instant.now());appeal.setSubmissionAt(d.getSubmittedAt());appealId=appeals.saveAndFlush(appeal).getId();
        });
    }
    HttpResponse<String> call(String method,String path,Map<String,Object> body,String bearer)throws Exception {
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path));
        if(bearer!=null)b.header("Authorization","Bearer "+bearer);
        b.header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return HttpClient.newHttpClient().send(b.build(),HttpResponse.BodyHandlers.ofString());
    }
    Map<String,Object> approval() {
        var d=submissions.findById(user).orElseThrow();
        return Map.of("approved",true,"version",d.getVersion(),"submittedAt",d.getSubmittedAt().toString(),
                "fullName","Synthetic Name","reason","ADMIN inspected all supplied images");
    }
    @Test void browserPayloadApprovesDuplicateWithoutClaimAndPreservesOtherAccount()throws Exception {
        var r=call("POST","/admin/identities/"+user+"/review",approval(),token);
        assertEquals(200,r.statusCode(),r.body());
        assertEquals("VERIFIED",identities.findById(user).orElseThrow().getStatus());
        assertEquals("VERIFIED",identities.findById(existingOwner).orElseThrow().getStatus());
        assertEquals("RESOLVED",appeals.findById(appealId).orElseThrow().getStatus());
        assertEquals(admin,appeals.findById(appealId).orElseThrow().getClaimedBy());
        assertTrue(service.eligibility(user).eligible());assertTrue(service.mine(user).documentConfirmed());
    }
    @Test void missingOcrNumberStillCompletesProfile()throws Exception {
        tx.executeWithoutResult(s->submissions.findById(user).orElseThrow().setDocumentNumber(null));
        var r=call("POST","/admin/identities/"+user+"/review",approval(),token);
        assertEquals(200,r.statusCode(),r.body());
        assertTrue(service.mine(user).documentConfirmed());assertTrue(service.mine(user).selfieVerified());assertTrue(service.eligibility(user).eligible());
    }
    @Test void correctingDuplicateNumberThenApprovingUsesLatestVersion()throws Exception {
        var d=submissions.findById(user).orElseThrow();
        var r=call("PATCH","/admin/identities/"+user+"/document-number",
                Map.of("documentNumber","012345678901","reason","Read from image","pending",true,"version",d.getVersion()),token);
        assertEquals(200,r.statusCode(),r.body());
        r=call("POST","/admin/identities/"+user+"/review",approval(),token);assertEquals(200,r.statusCode(),r.body());
    }
    @Test void anotherAdminsClaimStillReturnsConflict()throws Exception {
        tx.executeWithoutResult(s->{var a=appeals.findById(appealId).orElseThrow();a.setStatus("PROCESSING");a.setClaimedBy(UUID.randomUUID());});
        var r=call("POST","/admin/identities/"+user+"/review",approval(),token);assertEquals(409,r.statusCode(),r.body());
    }
    @Test void staleVersionRejectsAndRollsBackAutoClaim()throws Exception {
        var body=new HashMap<>(approval());body.put("version",99);
        var r=call("POST","/admin/identities/"+user+"/review",body,token);assertEquals(409,r.statusCode(),r.body());
        var a=appeals.findById(appealId).orElseThrow();assertEquals("REQUESTED",a.getStatus());assertNull(a.getClaimedBy());
    }
    @Test void missingImageStillRejects()throws Exception {
        tx.executeWithoutResult(s->submissions.findById(user).orElseThrow().setBackImage(null));
        var r=call("POST","/admin/identities/"+user+"/review",approval(),token);assertEquals(409,r.statusCode(),r.body());
    }
    @Test void userCannotApproveOwnIdentity()throws Exception {
        String userToken=tx.execute(s->jwt.issueTokens(users.findById(user).orElseThrow()).accessToken());
        var r=call("POST","/admin/identities/"+user+"/review",approval(),userToken);assertEquals(403,r.statusCode(),r.body());
    }
}
