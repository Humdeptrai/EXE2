package com.handsfree.be.identity;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.serviceImpl.*;
import com.handsfree.be.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Isolated real HTTP/JWT/database workflow. Face inference is synthetic. */
@SpringBootTest(classes=HandsFreeApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:photo-upload;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
    "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
class IdentityPhotoUploadHttpTest {
    @Value("${local.server.port}") int port;
    @Autowired UserRepository users;
    @Autowired PlatformSettingsRepository settings;
    @Autowired IdentityProgressRepository progress;
    @Autowired IdentitySubmissionRepository submissions;
    @Autowired IdentityRegistryLockRepository mutex;
    @Autowired IdentityProgressService service;
    @Autowired IdentityCrypto crypto;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired TransactionTemplate tx;
    @MockitoBean FaceWorkerClient worker;
    UUID user;
    String userToken, adminToken, staffToken;
    byte[] portrait;

    @BeforeEach void setup() throws Exception {
        reset(worker);
        tx.executeWithoutResult(status -> {
            var s=settings.findById(1).orElseGet(PlatformSettings::new);s.setId(1);s.setFacePhotoUploadEnabled(false);s.setConsumerFee(BigDecimal.valueOf(10000));s.setProviderFee(BigDecimal.valueOf(5000));
            s.setMinTopUp(10000);s.setMaxTopUp(5000000);s.setTopUpEnabled(true);settings.saveAndFlush(s);
            if(!mutex.existsById(1)) {var lock=new IdentityRegistryLock();lock.setId(1);mutex.saveAndFlush(lock);}
            user=account(UserRole.USER);userToken=jwt.issueTokens(users.findById(user).orElseThrow()).accessToken();
            var admin=account(UserRole.ADMIN);adminToken=jwt.issueTokens(users.findById(admin).orElseThrow()).accessToken();
            var staff=account(UserRole.STAFF);staffToken=jwt.issueTokens(users.findById(staff).orElseThrow()).accessToken();
        });
        var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(640,480,BufferedImage.TYPE_INT_RGB),"jpg",out);portrait=out.toByteArray();
        when(worker.send(eq("POST"),eq("/photo-reference"),any(),any())).thenReturn(json.readTree(json.writeValueAsString(
            Map.of("policyVersion",4,"accepted",true,"checkpoint",token("PHOTO_UPLOAD",0)))));
    }
    UUID account(UserRole role) {
        return users.saveAndFlush(User.builder().fullName("Synthetic User").role(role)
            .currentMode(UserMode.CONSUMER).authProvider(AuthProvider.LOCAL).active(true).profileCompleted(true).build()).getId();
    }
    String token(String source,int total) {
        var state=new HashMap<String,Object>();state.put("source",source);state.put("policyVersion",4);state.put("total",total);
        state.put("pad",total==0?List.of():Collections.nCopies(6,.9));state.put("nonce",UUID.randomUUID().toString());
        state.put("portrait",Base64.getEncoder().encodeToString(portrait));state.put("reference",List.of(Collections.nCopies(128,.1)));
        state.put("documents",Map.of());
        return Base64.getEncoder().encodeToString(json.writeValueAsString(state).getBytes(StandardCharsets.UTF_8))+".synthetic";
    }
    HttpResponse<String> call(String method,String path,Object body,String bearer) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path));
        if(bearer!=null)builder.header("Authorization","Bearer "+bearer);
        builder.header("Content-Type","application/json").method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        return HttpClient.newHttpClient().send(builder.build(),HttpResponse.BodyHandlers.ofString());
    }
    HttpResponse<String> upload(String path,String part,String bearer,byte[] image) throws Exception {
        String boundary="synthetic-photo-boundary";
        var bytes=new ByteArrayOutputStream();bytes.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+part+"\"; filename=\"face.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        bytes.write(image);bytes.write(("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8));
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path)).header("Authorization","Bearer "+bearer)
            .header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(bytes.toByteArray())).build();
        return HttpClient.newHttpClient().send(request,HttpResponse.BodyHandlers.ofString());
    }
    void enabled(boolean value) throws Exception {
        var r=call("PATCH","/admin/settings/identity",Map.of("facePhotoUploadEnabled",value),adminToken);
        assertEquals(200,r.statusCode(),r.body());
    }

    @Test void defaultsOffAndOnlyAdminCanChangeTheSwitch() throws Exception {
        var options=call("GET","/identity/progress/options",null,userToken);
        assertEquals(200,options.statusCode(),options.body());
        assertFalse(json.readTree(options.body()).path("result").path("facePhotoUploadEnabled").asBoolean());
        for(var token:List.of(userToken,staffToken)) assertEquals(403,call("PATCH","/admin/settings/identity",Map.of("facePhotoUploadEnabled",true),token).statusCode());
        assertEquals(401,call("PATCH","/admin/settings/identity",Map.of("facePhotoUploadEnabled",true),null).statusCode());
        enabled(true);assertTrue(settings.findById(1).orElseThrow().isFacePhotoUploadEnabled());
        enabled(false);assertFalse(settings.findById(1).orElseThrow().isFacePhotoUploadEnabled());
    }
    @Test void disabledEndpointCannotBeBypassedAndCameraFlowStillWorks() throws Exception {
        var r=upload("/identity/progress/face-photo?consent=true","face",userToken,portrait);
        assertEquals(403,r.statusCode(),r.body());assertEquals(40362,json.readTree(r.body()).path("code").asInt());
        verifyNoInteractions(worker);
        service.saveScan(user,token("LIVE_SCAN",6));
        assertTrue(service.get(user).scanPassed());assertFalse(service.get(user).facePhotoUploaded());
    }
    @Test void uploadStoresPhotoProvenanceAndCannotAutoFinishOrContinueAfterDisable() throws Exception {
        enabled(true);
        assertEquals(400,upload("/identity/progress/face-photo?consent=false","face",userToken,portrait).statusCode());
        assertEquals(400,upload("/identity/progress/face-photo?consent=true","face",userToken,new byte[]{1,2,3}).statusCode());
        var r=upload("/identity/progress/face-photo?consent=true","face",userToken,portrait);
        assertEquals(200,r.statusCode(),r.body());var result=json.readTree(r.body()).path("result");
        assertTrue(result.path("facePhotoUploaded").asBoolean());assertFalse(result.path("scanPassed").asBoolean());
        assertFalse(result.path("selfiePassed").asBoolean());
        var finish=call("POST","/identity/progress/finish",null,userToken);
        assertEquals(409,finish.statusCode(),finish.body());assertEquals(40962,json.readTree(finish.body()).path("code").asInt());
        enabled(false);
        assertEquals(403,upload("/identity/progress/selfie","selfie",userToken,portrait).statusCode());
        assertEquals(403,upload("/identity/progress/documents/front","document",userToken,portrait).statusCode());
        verify(worker,times(1)).send(eq("POST"),eq("/photo-reference"),any(),any());
    }
    @Test void photoReviewKeepsLiveFalseUntilAndAfterManualApproval() throws Exception {
        enabled(true);
        assertEquals(200,upload("/identity/progress/face-photo?consent=true","face",userToken,portrait).statusCode());
        tx.executeWithoutResult(status -> {
            var p=progress.findById(user).orElseThrow();p.setSelfieImage(crypto.encrypt(portrait));p.setSelfiePassed(true);
            p.setFrontImage(crypto.encrypt(portrait));p.setBackImage(crypto.encrypt(portrait));progress.saveAndFlush(p);
        });
        var r=call("POST","/identity/progress/review",Map.of("fullName","SYNTHETIC USER","documentNumber","012345678901","note","Synthetic review"),userToken);
        assertEquals(200,r.statusCode(),r.body());var draft=submissions.findById(user).orElseThrow();
        assertFalse(draft.getLive());assertEquals("REVIEW_REQUIRED",draft.getStatus());
        assertTrue(crypto.text(draft.getDocumentData()).contains("PHOTO_UPLOAD"));
        var approve=Map.of("approved",true,"version",draft.getVersion(),"submittedAt",draft.getSubmittedAt().toString(),"fullName","SYNTHETIC USER","reason","Inspected synthetic images");
        var approved=call("POST","/admin/identities/"+user+"/review",approve,adminToken);
        assertEquals(200,approved.statusCode(),approved.body());
        assertEquals("VERIFIED",service.get(user).status());
        assertFalse(service.get(user).scanPassed());assertTrue(service.get(user).facePhotoUploaded());
    }
}
