package com.handsfree.be.serviceImpl;

import com.handsfree.be.properties.IdentityProperties;
import com.handsfree.be.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

@Component @RequiredArgsConstructor
public class IdentityCrypto {
    private final IdentityProperties properties;
    private static final SecureRandom RANDOM = new SecureRandom();
    private SecretKeySpec key() {
        try {
            byte[] raw = Base64.getDecoder().decode(properties.getEncryptionKey());
            if (raw.length != 32) throw new IllegalArgumentException();
            return new SecretKeySpec(raw, "AES");
        } catch (Exception e) { throw new AppException(ErrorCode.IDENTITY_NOT_CONFIGURED); }
    }
    public void validateKey() { key(); }
    public byte[] encrypt(byte[] plain) {
        try {
            byte[] nonce = new byte[12]; RANDOM.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(plain);
            byte[] out = Arrays.copyOf(nonce, nonce.length + encrypted.length);
            System.arraycopy(encrypted, 0, out, nonce.length, encrypted.length);
            return out;
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.FILE_STORAGE_FAILED); }
    }
    public byte[] decrypt(byte[] encrypted) {
        if (encrypted == null) return null;
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Arrays.copyOf(encrypted, 12)));
            return cipher.doFinal(Arrays.copyOfRange(encrypted, 12, encrypted.length));
        } catch (AppException e) { throw e; }
        catch (Exception e) { throw new AppException(ErrorCode.FILE_STORAGE_FAILED); }
    }
    public byte[] encrypt(String value) { return encrypt(value.getBytes(StandardCharsets.UTF_8)); }
    public String text(byte[] encrypted) { return encrypted == null ? null : new String(decrypt(encrypted), StandardCharsets.UTF_8); }
}
