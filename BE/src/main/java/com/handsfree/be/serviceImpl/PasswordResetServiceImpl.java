package com.handsfree.be.serviceImpl;
import com.handsfree.be.service.*;
import com.handsfree.be.repository.*;
import com.handsfree.be.entity.PasswordReset;
import com.handsfree.be.constant.UserRole;
import com.handsfree.be.exception.*;
import com.handsfree.be.security.TokenHash;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.Instant;
import java.util.*;
@Service @RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {
 @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
 private final UserRepository users;private final PasswordResetRepository resets;private final RefreshTokenRepository refresh;
 private final AccountMailService mail;private final PasswordEncoder encoder;private final TransactionTemplate transactions;
 @Value("${PASSWORD_RESET_URL:https://handsfree-fe.vercel.app/reset-password}") private String resetUrl;
 private static final java.security.SecureRandom RANDOM=new java.security.SecureRandom();
 private long window=0;private int attempts=0;
 private synchronized void allow(){long now=System.currentTimeMillis()/60000;if(now!=window){window=now;attempts=0;}if(++attempts>120)throw new AppException(ErrorCode.PASSWORD_RESET_RATE_LIMIT);}
 private record Delivery(String email,String token) {}
 public void request(String email) {
  allow();
  mail.requireConfigured();
  java.net.URI uri;try{uri=java.net.URI.create(resetUrl);if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!("https".equals(uri.getScheme())||"http".equals(uri.getScheme())&&Set.of("localhost","127.0.0.1").contains(uri.getHost())))throw new IllegalArgumentException();}catch(Exception e){throw new AppException(ErrorCode.PASSWORD_RESET_UNAVAILABLE);}
  Delivery delivery=transactions.execute(tx->{
   var account=users.findByEmailIgnoreCase(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
   if(account==null)return null;var u=users.lockById(account.getId()).orElseThrow();
   if(!u.isActive()||u.getRole()!=UserRole.USER||u.getPasswordHash()==null)return null;
   Instant now=Instant.now();if(resets.existsByUserIdAndCreatedAtAfter(u.getId(),now.minusSeconds(60))||resets.countByUserIdAndCreatedAtAfter(u.getId(),now.minusSeconds(3600))>=3)return null;
   byte[] bytes=new byte[32];RANDOM.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
   resets.consumeAll(u.getId(),now);var p=new PasswordReset();p.setTokenHash(TokenHash.sha256(token));p.setUserId(u.getId());p.setCreatedAt(now);p.setExpiresAt(now.plusSeconds(900));resets.save(p);return new Delivery(u.getEmail(),token);
  });
  // Never hold a database row lock while waiting for the SMTP server.
  if(delivery!=null)try{mail.resetPassword(delivery.email(),resetUrl+"#token="+delivery.token());}catch(AppException e){
   // Same public response for known/unknown email, even when the provider fails.
   org.slf4j.LoggerFactory.getLogger(getClass()).warn("Password reset mail delivery failed; check mail provider configuration (no recipient/token logged)");
  }
 }
 public void reset(String token,String password) {
  allow();
  if(token==null||!token.matches("[A-Za-z0-9_-]{43}")||password==null||!password.matches("^(?=.*[A-Za-z])(?=.*\\d).{8,72}$")||password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw new AppException(ErrorCode.PASSWORD_RESET_INVALID);
  String encoded=encoder.encode(password);
  transactions.executeWithoutResult(tx->{
   var initial=resets.findById(TokenHash.sha256(token)).orElseThrow(()->new AppException(ErrorCode.PASSWORD_RESET_INVALID));
   var u=users.lockById(initial.getUserId()).orElseThrow(()->new AppException(ErrorCode.PASSWORD_RESET_INVALID));
   // Re-read after locking owner: reset/request/refresh use the same owner lock.
   entityManager.refresh(initial);var p=initial;
   if(p.getConsumedAt()!=null||!p.getExpiresAt().isAfter(Instant.now())||!u.isActive()||u.getRole()!=UserRole.USER||u.getPasswordHash()==null)throw new AppException(ErrorCode.PASSWORD_RESET_INVALID);
   p.setConsumedAt(Instant.now());resets.consumeAll(u.getId(),Instant.now());u.setPasswordHash(encoded);u.setTokenVersion(u.getTokenVersion()+1);refresh.deleteAllByUserId(u.getId());users.saveAndFlush(u);
  });
 }
}
