package com.handsfree.be.serviceImpl;

import com.handsfree.be.exception.*;
import com.handsfree.be.properties.JwtProperties;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.Instant;
import java.util.*;

@Service @RequiredArgsConstructor
public class RegistrationEmailServiceImpl implements RegistrationEmailService {
    private final PlatformSettingsService settings;
    private final RegistrationEmailOtpRepository codes;
    private final UserRepository users;
    private final AccountMailService mail;
    private final JwtProperties jwt;
    private static final SecureRandom RANDOM=new SecureRandom();
    private long minute;
    private int requests;
    private synchronized void allowSend() {
        long now=System.currentTimeMillis()/60000;
        if(now!=minute){minute=now;requests=0;}
        if(++requests>30)throw new AppException(ErrorCode.REGISTRATION_OTP_RATE_LIMIT);
    }
    @Override public Policy policy(){return new Policy(settings.get().isRegistrationEmailOtpEnabled());}
    @Override @Transactional
    public Delivery send(String input) {
        allowSend();
        String email=normalize(input);
        if(!policy().emailOtpRequired())throw new AppException(ErrorCode.REGISTRATION_OTP_DISABLED);
        if(users.existsByEmailIgnoreCase(email))throw new AppException(ErrorCode.IDENTIFIER_ALREADY_EXISTS);
        codes.initialize(email);
        var row=codes.lockByEmail(email).orElseThrow();
        Instant now=Instant.now();
        if(row.getSentAt()!=null&&row.getSentAt().plusSeconds(60).isAfter(now))throw new AppException(ErrorCode.REGISTRATION_OTP_RATE_LIMIT);
        if(row.getWindowStartedAt()==null||!row.getWindowStartedAt().plusSeconds(3600).isAfter(now)){
            row.setWindowStartedAt(now);row.setSendCount(0);
        }
        if(row.getSendCount()>=5)throw new AppException(ErrorCode.REGISTRATION_OTP_RATE_LIMIT);
        String code=String.format(Locale.ROOT,"%06d",RANDOM.nextInt(1000000));
        row.setNonce(UUID.randomUUID().toString()); row.setCodeHash(hash(email,row.getNonce(),code));
        row.setExpiresAt(now.plusSeconds(600)); row.setSentAt(now); row.setConsumedAt(null);
        row.setFailedAttempts(0); row.setSendCount(row.getSendCount()+1);
        // Synchronous bounded delivery: provider failures roll back the new challenge,
        // leaving the previous code usable and permitting a retry.
        mail.registrationOtp(email,code);
        codes.save(row);
        return new Delivery(600,60);
    }
    @Override @Transactional(propagation=Propagation.MANDATORY)
    public ErrorCode consume(String email,String code) {
        if(!policy().emailOtpRequired())return null;
        if(code==null||!code.matches("[0-9]{6}"))return ErrorCode.REGISTRATION_OTP_REQUIRED;
        var row=codes.lockByEmail(email).orElse(null);
        Instant now=Instant.now();
        if(row==null||row.getCodeHash()==null||row.getConsumedAt()!=null||row.getExpiresAt()==null||!row.getExpiresAt().isAfter(now))return ErrorCode.REGISTRATION_OTP_INVALID;
        if(row.getFailedAttempts()>=5)return ErrorCode.REGISTRATION_OTP_LOCKED;
        if(!MessageDigest.isEqual(row.getCodeHash().getBytes(StandardCharsets.UTF_8),hash(email,row.getNonce(),code).getBytes(StandardCharsets.UTF_8))){
            row.setFailedAttempts(row.getFailedAttempts()+1); codes.save(row);
            return row.getFailedAttempts()>=5?ErrorCode.REGISTRATION_OTP_LOCKED:ErrorCode.REGISTRATION_OTP_INVALID;
        }
        row.setConsumedAt(now);codes.save(row);return null;
    }
    @org.springframework.scheduling.annotation.Scheduled(fixedDelay=3600000, initialDelay=3600000)
    @Transactional
    public void removeOldChallenges(){ codes.deleteOld(Instant.now().minusSeconds(86400)); }

    public static String normalize(String input) {
        String email=input==null?"":input.trim().toLowerCase(Locale.ROOT);
        if(email.length()>254||!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))throw new AppException(ErrorCode.INVALID_IDENTIFIER);
        return email;
    }
    private String hash(String email,String nonce,String code) {
        try {
            Mac mac=Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwt.secret().getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("registration:"+email+":"+nonce+":"+code).getBytes(StandardCharsets.UTF_8)));
        }catch(GeneralSecurityException e){throw new IllegalStateException("Cannot protect registration code",e);}
    }
}
