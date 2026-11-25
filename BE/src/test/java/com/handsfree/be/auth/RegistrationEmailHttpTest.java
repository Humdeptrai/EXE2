package com.handsfree.be.auth;

import com.handsfree.be.HandsFreeApplication;
import com.handsfree.be.constant.*;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.security.JwtService;
import com.handsfree.be.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=HandsFreeApplication.class,webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
 "spring.config.import=", "spring.datasource.url=jdbc:h2:mem:registration-email;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
 "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
 "app.jwt.secret=synthetic-test-secret-000000000000000000000", "app.operator-bootstrap.enabled=false",
 "app.identity.encryption-key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "logging.level.root=ERROR"
})
class RegistrationEmailHttpTest {
 @Value("${local.server.port}") int port;
 @Autowired UserRepository users;
 @Autowired PlatformSettingsRepository settings;
 @Autowired AdminAuditRepository audit;
 @Autowired JwtService jwt;
 @Autowired ObjectMapper json;
 @Autowired TransactionTemplate tx;
 @Autowired RegistrationEmailService emailService;
 @MockitoBean PlatformSettingsService settingsService;
 @MockitoBean AccountMailService mail;
 @MockitoSpyBean RegistrationEmailOtpRepository codes;
 final HttpClient client=HttpClient.newHttpClient();
 final Map<String,String> delivered=new ConcurrentHashMap<>();
 String account(UserRole role){return tx.execute(s->jwt.issueTokens(users.saveAndFlush(User.builder().fullName("Synthetic operator")
  .role(role).active(true).authProvider(AuthProvider.LOCAL).currentMode(UserMode.CONSUMER).build())).accessToken());}
 HttpResponse<String> call(String method,String path,Object body,String token)throws Exception{
  var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/v1"+path)).header("Content-Type","application/json");
  if(token!=null)request.header("Authorization","Bearer "+token);
  return client.send(request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
 }
 HttpResponse<String> register(String email,String code)throws Exception{
  Map<String,Object> body=new HashMap<>(Map.of("fullName","Synthetic person","identifier",email,"password","Password123","termsAccepted",true));
  if(code!=null)body.put("emailOtp",code);
  return call("POST","/auth/register",body,null);
 }
 void ageCode(String email){tx.executeWithoutResult(s->{var row=codes.findById(email).orElseThrow();row.setSentAt(Instant.now().minusSeconds(61));codes.saveAndFlush(row);});}
 @Test void emailOnlyRegistrationWithAdminPolicyAttemptsExpiryReplayAndDeliveryFailure()throws Exception{
  tx.executeWithoutResult(status->{var s=new PlatformSettings();s.setId(1);s.setConsumerFee(BigDecimal.valueOf(10000));s.setProviderFee(BigDecimal.valueOf(5000));s.setMinTopUp(10000);s.setMaxTopUp(5000000);settings.saveAndFlush(s);});
  when(settingsService.get()).thenAnswer(i->settings.findById(1).orElseThrow());
  // Only replace PostgreSQL's ON CONFLICT initializer; reads, locks, writes and
  // failed-attempt commits below use the real H2 transaction manager/repository.
  doAnswer(i->{String email=i.getArgument(0);if(!codes.existsById(email)){var row=new RegistrationEmailOtp();row.setEmail(email);codes.saveAndFlush(row);}return null;}).when(codes).initialize(anyString());
  doAnswer(i->{delivered.put(i.getArgument(0),i.getArgument(1));return null;}).when(mail).registrationOtp(anyString(),anyString());
  String admin=account(UserRole.ADMIN),staff=account(UserRole.STAFF),user=account(UserRole.USER);
  Map<String,Object> on=Map.of("registrationEmailOtpEnabled",true),off=Map.of("registrationEmailOtpEnabled",false);
  assertEquals(401,call("PATCH","/admin/settings/registration-email",on,null).statusCode());
  assertEquals(403,call("PATCH","/admin/settings/registration-email",on,staff).statusCode());
  assertEquals(403,call("PATCH","/admin/settings/registration-email",on,user).statusCode());
  assertEquals(400,call("PATCH","/admin/settings/registration-email",Map.of(),admin).statusCode());
  assertFalse(json.readTree(call("GET","/auth/register/policy",null,null).body()).path("result").path("emailOtpRequired").asBoolean());
  assertEquals(400,register("0912345678",null).statusCode());
  assertEquals(201,register("unverified@example.test",null).statusCode());
  assertEquals(200,call("PATCH","/admin/settings/registration-email",on,admin).statusCode());
  assertEquals(403,register("verified@example.test",null).statusCode());
  assertFalse(users.existsByEmailIgnoreCase("verified@example.test"));
  assertEquals(200,call("POST","/auth/register/email-otp",Map.of("email","VERIFIED@example.test"),null).statusCode());
  String code=delivered.get("verified@example.test");assertTrue(code.matches("[0-9]{6}"));
  assertNotEquals(code,codes.findById("verified@example.test").orElseThrow().getCodeHash());
  assertEquals(429,call("POST","/auth/register/email-otp",Map.of("email","verified@example.test"),null).statusCode());
  String wrong=code.equals("000000")?"000001":"000000";
  for(int n=1;n<=5;n++){
   assertEquals(n==5?429:400,register("verified@example.test",wrong).statusCode());
   assertEquals(n,codes.findById("verified@example.test").orElseThrow().getFailedAttempts());
  }
  assertEquals(429,register("verified@example.test",code).statusCode());
  ageCode("verified@example.test");
  assertEquals(200,call("POST","/auth/register/email-otp",Map.of("email","verified@example.test"),null).statusCode());
  code=delivered.get("verified@example.test");
  assertEquals(400,register("different@example.test",code).statusCode());
  assertEquals(201,register("verified@example.test",code).statusCode());
  assertNotNull(codes.findById("verified@example.test").orElseThrow().getConsumedAt());
  final String usedCode=code;
  assertEquals(ErrorCode.REGISTRATION_OTP_INVALID,tx.execute(s->emailService.consume("verified@example.test",usedCode)));
  assertEquals(200,call("POST","/auth/register/email-otp",Map.of("email","expired@example.test"),null).statusCode());
  tx.executeWithoutResult(s->{var row=codes.findById("expired@example.test").orElseThrow();row.setExpiresAt(Instant.now().minusSeconds(1));codes.saveAndFlush(row);});
  assertEquals(400,register("expired@example.test",delivered.get("expired@example.test")).statusCode());
  for(int n=0;n<5;n++){
   if(n>0)ageCode("quota@example.test");
   assertEquals(200,call("POST","/auth/register/email-otp",Map.of("email","quota@example.test"),null).statusCode());
  }
  ageCode("quota@example.test");
  assertEquals(429,call("POST","/auth/register/email-otp",Map.of("email","quota@example.test"),null).statusCode());
  doThrow(new AppException(ErrorCode.REGISTRATION_OTP_UNAVAILABLE)).when(mail).registrationOtp(eq("failure@example.test"),anyString());
  assertEquals(503,call("POST","/auth/register/email-otp",Map.of("email","failure@example.test"),null).statusCode());
  assertTrue(codes.findById("failure@example.test").isEmpty());
  assertEquals(200,call("PATCH","/admin/settings/registration-email",off,admin).statusCode());
  assertEquals(201,register("no-mailbox@example.test",null).statusCode());
  assertEquals(409,call("POST","/auth/register/email-otp",Map.of("email","not-needed@example.test"),null).statusCode());
  assertEquals(2,audit.findAll().stream().filter(a->"REGISTRATION_EMAIL_SETTINGS".equals(a.getAction())).count());
  assertEquals(10000,settings.findById(1).orElseThrow().getConsumerFee().intValue());
 }
}
