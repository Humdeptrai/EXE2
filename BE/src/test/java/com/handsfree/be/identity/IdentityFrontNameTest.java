package com.handsfree.be.identity;

import com.handsfree.be.constant.UserRole;
import com.handsfree.be.entity.*;
import com.handsfree.be.exception.*;
import com.handsfree.be.properties.IdentityProperties;
import com.handsfree.be.repository.*;
import com.handsfree.be.service.*;
import com.handsfree.be.serviceImpl.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.json.JsonMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Synthetic checkpoint evidence; no production identities or OCR/model calls. */
class IdentityFrontNameTest {
    final UUID user = UUID.randomUUID();
    final JsonMapper json = JsonMapper.builder().build();
    IdentityProgressRepository repository;
    FaceWorkerClient worker;
    IdentityService identity;
    IdentityCrypto crypto;
    IdentityProgressService service;
    IdentityProgress progress;
    IdentityProgressRepository.Snapshot snapshot;

    @BeforeEach void setup() {
        repository=mock(IdentityProgressRepository.class);worker=mock(FaceWorkerClient.class);
        identity=mock(IdentityService.class);
        var users=mock(UserRepository.class);var access=mock(AccountAccess.class);
        var account=User.builder().id(user).role(UserRole.USER).active(true).fullName("Synthetic account").build();
        when(access.active(user)).thenReturn(account);when(users.lockById(user)).thenReturn(Optional.of(account));
        var properties=new IdentityProperties();properties.setEncryptionKey(Base64.getEncoder().encodeToString(new byte[32]));
        crypto=new IdentityCrypto(properties);
        service=new IdentityProgressServiceImpl(mock(IdentityRegistryService.class),repository,users,
            mock(IdentityRepository.class),mock(IdentitySubmissionRepository.class),access,crypto,worker,json,identity);
        progress=new IdentityProgress();progress.setUserId(user);progress.setSelfiePassed(true);progress.setStatus("DRAFT");
        progress.setFrontImage(crypto.encrypt(new byte[]{1}));progress.setFrontPassed(true);
        progress.setCheckpoint(crypto.encrypt(token("AN OLD NAME")));
        when(repository.lockById(user)).thenReturn(Optional.of(progress));
        snapshot=mock(IdentityProgressRepository.Snapshot.class);
        when(snapshot.getStatus()).thenReturn("DRAFT");when(snapshot.getHasFront()).thenReturn(true);
        when(snapshot.getFrontPassed()).thenReturn(true);
        when(repository.findSnapshot(user)).thenReturn(Optional.of(snapshot));
        when(identity.mine(user)).thenReturn(personal("REVIEW_REQUIRED", "AN OLD NAME", null));
        when(repository.findCheckpoint(user)).thenAnswer(call -> Optional.of((IdentityProgressRepository.CheckpointData) progress::getCheckpoint));
    }

    String token(String name) {
        var front=Map.of("passed",true,"fullName",name,"documentNumber","012345678901");
        String payload=json.writeValueAsString(Map.of("documents",Map.of("front",front),"padding","x".repeat(1200)));
        return Base64.getEncoder().encodeToString(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8))+".synthetic";
    }
    IdentityService.MyIdentity personal(String status,String name,Instant verifiedAt) {
        boolean verified="VERIFIED".equals(status);
        return new IdentityService.MyIdentity(new IdentityService.Status(user,status,null,null,verifiedAt,true),
            "012345678901",verified,true,verified,null,false,null,null,null,name,"old");
    }
    MockMultipartFile front() throws Exception {
        var out=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(640,480,BufferedImage.TYPE_INT_RGB),"jpeg",out);
        return new MockMultipartFile("front","front.jpg","image/jpeg",out.toByteArray());
    }

    @Test void recaptureImmediatelyReturnsLatestNameWithoutChangingApprovedIdentity() throws Exception {
        String next=token("ĐẶNG VĂN AN");
        when(worker.send(eq("POST"),eq("/checkpoints/front"),any(),any())).thenReturn(
            json.readTree(json.writeValueAsString(Map.of("policyVersion",4,"passed",true,"reasonCode","OK","checkpoint",next))));
        var result=service.document(user,"front",front());
        assertEquals("DANG VAN AN",result.documentFullName());
        assertEquals("DRAFT",result.status());assertTrue(result.frontPassed());
        assertEquals("DANG VAN AN",service.profile(user).progress().documentFullName());
        verify(identity,never()).storeScan(any(),any());
        verify(repository).saveAndFlush(progress);
    }

    @Test void failedRecaptureDoesNotExposePreviousCheckpointName() throws Exception {
        when(worker.send(eq("POST"),eq("/checkpoints/front"),any(),any()))
            .thenThrow(new AppException(ErrorCode.IDENTITY_GATEWAY_ERROR));
        var result=service.document(user,"front",front());
        assertFalse(result.frontPassed());assertNull(result.documentFullName());
        when(snapshot.getFrontPassed()).thenReturn(false);
        assertNull(service.profile(user).progress().documentFullName());
        verify(repository,never()).findCheckpoint(user);
    }

    @Test void newerApprovedIdentityUsesApprovedNameWithoutLoadingCheckpoint() {
        var approval=Instant.parse("2026-11-10T12:00:00Z");
        when(identity.mine(user)).thenReturn(personal("VERIFIED","ĐẶNG VĂN AN",approval));
        when(snapshot.getUpdatedAt()).thenReturn(approval.minusSeconds(1));
        assertEquals("DANG VAN AN",service.get(user).documentFullName());
        assertEquals("VERIFIED",service.get(user).status());
        verify(repository,never()).findCheckpoint(user);
    }

    @Test void unreadableNameInCurrentCheckpointNeverFallsBackToOldName() {
        progress.setCheckpoint(crypto.encrypt(token("'RINH DAT HOANG")));
        assertNull(service.profile(user).progress().documentFullName());
    }
}
