package com.handsfree.be.serviceImpl;

import com.handsfree.be.service.AccountMailService;
import com.handsfree.be.exception.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** HTTPS transactional mail: Render Free does not permit standard SMTP ports. */
@Service
public class AccountMailServiceImpl implements AccountMailService {
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
 private final java.util.concurrent.ThreadPoolExecutor deliveries=new java.util.concurrent.ThreadPoolExecutor(1,2,30,java.util.concurrent.TimeUnit.SECONDS,new java.util.concurrent.ArrayBlockingQueue<>(24),r->{Thread t=new Thread(r,"account-mail");t.setDaemon(true);return t;},new java.util.concurrent.ThreadPoolExecutor.AbortPolicy());
 private final ObjectMapper json;
 private final String apiKey;
 private final String from;
 public AccountMailServiceImpl(ObjectMapper json,@Value("${BREVO_API_KEY:}") String apiKey,@Value("${MAIL_FROM:}") String from){this.json=json;this.apiKey=apiKey;this.from=from;}
 public void requireConfigured(){if(apiKey.isBlank()||from.isBlank()||from.contains("\r")||from.contains("\n"))throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);}
 public void resetPassword(String email,String url){
  requireConfigured();
  try{deliveries.execute(()->{try{deliver(email,url);}catch(AppException e){org.slf4j.LoggerFactory.getLogger(getClass()).warn("Password reset mail delivery failed; check provider dashboard (no recipient/token logged)");}});}
  catch(java.util.concurrent.RejectedExecutionException e){throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);}
 }
 @jakarta.annotation.PreDestroy public void shutdown(){deliveries.shutdown();try{if(!deliveries.awaitTermination(12,java.util.concurrent.TimeUnit.SECONDS))deliveries.shutdownNow();}catch(InterruptedException e){Thread.currentThread().interrupt();deliveries.shutdownNow();}}
 public void registrationOtp(String email,String code){
  try{requireConfigured();deliverText(email,"HandsFree — Mã xác thực đăng ký","Mã xác thực đăng ký HandsFree của bạn: "+code+"\nMã có hiệu lực 10 phút và chỉ dùng một lần. Không chia sẻ mã với người khác. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.");}
  catch(AppException e){throw new AppException(ErrorCode.REGISTRATION_OTP_UNAVAILABLE);}
 }
 private void deliver(String email,String url){
  deliverText(email,"HandsFree — Đặt lại mật khẩu","Bạn vừa yêu cầu đặt lại mật khẩu HandsFree. Mở liên kết sau trong 15 phút:\n"+url+"\nLiên kết chỉ dùng một lần. Nếu không phải bạn yêu cầu, hãy bỏ qua email này. Không chia sẻ liên kết với người khác.");
 }
 private void deliverText(String email,String subject,String content){
  try {
   String body=json.writeValueAsString(Map.of("sender",Map.of("name","HandsFree","email",from),"to",List.of(Map.of("email",email)),
    "subject",subject,"textContent",content));
   var request=HttpRequest.newBuilder(URI.create("https://api.brevo.com/v3/smtp/email")).timeout(Duration.ofSeconds(10)).header("api-key",apiKey).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
   var response=client.send(request,HttpResponse.BodyHandlers.discarding());
   if(response.statusCode()<200||response.statusCode()>=300)throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);
  }catch(InterruptedException e){Thread.currentThread().interrupt();throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);}
   catch(AppException e){throw e;}catch(Exception e){throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);}
 }
}
