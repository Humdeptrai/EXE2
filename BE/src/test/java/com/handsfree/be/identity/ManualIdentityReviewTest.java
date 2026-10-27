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
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ManualIdentityReviewTest {
    IdentityRepository identities;
    IdentitySubmissionRepository submissions;
    IdentityAppealRepository appeals;
    IdentityRegistryService registry;
    UserRepository users;
    AccountAccess access;
    IdentityService service;
    IdentityCrypto crypto;
    IdentitySubmission draft;
    IdentityVerification active;
    IdentityAppeal appeal;
    UUID actor, user;

    @BeforeEach void setup() {
        identities=mock(IdentityRepository.class);submissions=mock(IdentitySubmissionRepository.class);
        appeals=mock(IdentityAppealRepository.class);registry=mock(IdentityRegistryService.class);
        users=mock(UserRepository.class);access=mock(AccountAccess.class);
        var properties=new IdentityProperties();properties.setEncryptionKey(Base64.getEncoder().encodeToString(new byte[32]));
        crypto=new IdentityCrypto(properties);
        service=new IdentityServiceImpl(identities,registry,submissions,appeals,mock(NotificationService.class),
                users,access,properties,crypto,mock(FptIdentityClient.class),mock(TransactionTemplate.class),
                mock(JobMatchRepository.class),mock(ContactAccess.class),mock(ManagementService.class));
        actor=UUID.randomUUID();user=UUID.randomUUID();
        var account=User.builder().id(user).role(UserRole.USER).active(true).fullName("Synthetic User").build();
        when(users.lockById(user)).thenReturn(Optional.of(account));
        when(users.findById(user)).thenReturn(Optional.of(account));when(access.active(user)).thenReturn(account);
        active=new IdentityVerification();active.setUserId(user);active.setStatus("REVIEW_REQUIRED");
        draft=new IdentitySubmission();draft.setUserId(user);draft.setStatus("REVIEW_REQUIRED");draft.setVersion(5);
        draft.setSubmittedAt(Instant.parse("2026-10-27T01:00:00.123456Z"));
        draft.setFrontImage(crypto.encrypt(new byte[]{1}));draft.setBackImage(crypto.encrypt(new byte[]{2}));
        draft.setFaceImage(crypto.encrypt(new byte[]{3}));draft.setSelfieImage(crypto.encrypt(new byte[]{4}));
        draft.setFullName(crypto.encrypt("Synthetic Name"));draft.setDocumentNumber(crypto.encrypt("012345678901"));
        draft.setDocumentData(crypto.encrypt("OCR failed; face mismatch; duplicate document and image"));
        draft.setSimilarity(0.0);draft.setLive(false);
        appeal=new IdentityAppeal();appeal.setId(UUID.randomUUID());appeal.setUserId(user);
        appeal.setStatus("REQUESTED");appeal.setSubmissionAt(draft.getSubmittedAt());
        when(identities.findById(user)).thenReturn(Optional.of(active));
        when(submissions.lockById(user)).thenReturn(Optional.of(draft));
        when(submissions.findById(user)).thenReturn(Optional.of(draft));
        when(appeals.findFirstByUserIdAndStatusIn(eq(user),any())).thenReturn(Optional.of(appeal));
    }
    IdentityService.Review approve() {
        return new IdentityService.Review(true,draft.getSubmittedAt(),"Synthetic Name","ADMIN checked all images",draft.getVersion());
    }
    void noAutomaticChecks() {
        verify(registry,never()).assess(any(),any(),any());
        verify(registry,never()).claim(any(),any(),any(),anyBoolean(),anyBoolean());
        verify(registry,never()).claim(any(),any(),any(),anyBoolean(),anyBoolean(),any(),any());
    }
    void error(ErrorCode code,Runnable action) { assertEquals(code,assertThrows(AppException.class,action::run).getErrorCode()); }

    @Test void directReviewClaimsUnassignedAppealAndOverridesAutomaticFailures() {
        assertEquals("VERIFIED",service.review(actor,user,approve()).status());
        assertEquals(actor,appeal.getClaimedBy());assertEquals("RESOLVED",appeal.getStatus());
        assertNotNull(active.getSelfieVerifiedAt());assertNotNull(active.getDocumentNumberConfirmedAt());
        verify(submissions).delete(draft);noAutomaticChecks();
    }
    @Test void alreadyOwnedAppealCanBeApproved() {
        appeal.setStatus("PROCESSING");appeal.setClaimedBy(actor);
        assertEquals("VERIFIED",service.review(actor,user,approve()).status());noAutomaticChecks();
    }
    @Test void anotherAdminsClaimIsProtected() {
        appeal.setStatus("PROCESSING");appeal.setClaimedBy(UUID.randomUUID());
        error(ErrorCode.IDENTITY_REVIEW_CONFLICT,()->service.review(actor,user,approve()));
        assertNotEquals("VERIFIED",active.getStatus());verify(submissions,never()).delete(any());
    }
    @Test void missingOcrDocumentNumberDoesNotBlockAdminApproval() {
        draft.setDocumentNumber(null);
        assertEquals("VERIFIED",service.review(actor,user,approve()).status());noAutomaticChecks();
    }
    @Test void nonstandardDeclaredDocumentNumberDoesNotBlockAdminApproval() {
        draft.setDocumentNumber(crypto.encrypt("ADMIN-declared value"));
        assertEquals("VERIFIED",service.review(actor,user,approve()).status());noAutomaticChecks();
    }
    @Test void missingEvidenceStillCannotBeApproved() {
        draft.setBackImage(null);
        error(ErrorCode.IDENTITY_REVIEW_CONFLICT,()->service.review(actor,user,approve()));
        verify(submissions,never()).delete(any());
    }
    @Test void staleVersionCannotApproveNewEvidence() {
        var request=new IdentityService.Review(true,draft.getSubmittedAt(),"Synthetic Name","checked",4L);
        error(ErrorCode.IDENTITY_REVIEW_CONFLICT,()->service.review(actor,user,request));
    }
    @Test void staleSubmissionCannotApproveNewEvidence() {
        var request=new IdentityService.Review(true,draft.getSubmittedAt().minusSeconds(1),"Synthetic Name","checked",5L);
        error(ErrorCode.IDENTITY_REVIEW_CONFLICT,()->service.review(actor,user,request));
    }
    @Test void adminCanCorrectPendingNumberWithoutSeparateClaimScreen() {
        service.correctDocument(actor,user,new IdentityService.DocumentCorrection("098765432109","Read from image",true,5L));
        assertEquals(actor,appeal.getClaimedBy());assertEquals("PROCESSING",appeal.getStatus());
        assertEquals("098765432109",crypto.text(draft.getDocumentNumber()));noAutomaticChecks();
    }
    @Test void directReviewWithoutAppealCanBeApproved() {
        when(appeals.findFirstByUserIdAndStatusIn(eq(user),any())).thenReturn(Optional.empty());
        assertEquals("VERIFIED",service.review(actor,user,approve()).status());noAutomaticChecks();
    }
    @Test void appealReviewCanClaimAndResolveInOneTransaction() {
        when(appeals.findOwner(appeal.getId())).thenReturn(Optional.of(user));
        when(appeals.lockById(appeal.getId())).thenReturn(Optional.of(appeal));
        assertEquals("RESOLVED",service.resolveAppeal(actor,appeal.getId(),approve()).status());noAutomaticChecks();
    }
    @Test void rejectionStillWorks() {
        var request=new IdentityService.Review(false,draft.getSubmittedAt(),"","Missing readable evidence",5L);
        assertEquals("REJECTED",service.review(actor,user,request).status());
        assertEquals("REJECTED",appeal.getStatus());noAutomaticChecks();
    }
    @Test void nonAdminStillCannotApprove() {
        when(access.operator(actor,true)).thenThrow(new AppException(ErrorCode.FORBIDDEN));
        error(ErrorCode.FORBIDDEN,()->service.review(actor,user,approve()));
    }
    @Test void requestReviewDoesNotRequireAutomaticLiveResult() {
        when(appeals.findFirstByUserIdAndStatusIn(eq(user),any())).thenReturn(Optional.empty());
        assertEquals("REQUESTED",service.requestReview(user,new IdentityService.AppealRequest("Please inspect images")).status());
        noAutomaticChecks();
    }
    @Test void automaticApprovalStillChecksRegistryAndRejectsDuplicates() {
        when(appeals.findFirstByUserIdAndStatusIn(eq(user),any())).thenReturn(Optional.empty());
        when(registry.assess(eq(user),anyString(),anyString())).thenReturn(
                new IdentityRegistryService.Assessment(false,"Duplicate identity",List.of()));
        var data=new IdentityService.ScanSubmission(new byte[]{1},new byte[]{2},new byte[]{3},new byte[]{4},
                "Synthetic Name","012345678901","synthetic evidence",.9,true,"automatic");
        assertEquals("REVIEW_REQUIRED",service.storeScan(user,data).status());
        verify(registry).assess(user,"012345678901","synthetic evidence");
        verify(registry,never()).claim(any(),any(),any(),anyBoolean(),anyBoolean());
    }
    @Test void manualSubmissionNeverRunsRegistryEvenIfApprovedFlagIsSet() {
        when(appeals.findFirstByUserIdAndStatusIn(eq(user),any())).thenReturn(Optional.empty());
        var data=new IdentityService.ScanSubmission(new byte[]{1},new byte[]{2},new byte[]{3},new byte[]{4},
                "Synthetic Name","012345678901","synthetic evidence",.9,true,"manual");
        assertEquals("REQUESTED",service.submitManualReview(user,data,"Please review").status());
        noAutomaticChecks();
    }
    @Test void reviewJsonCanOmitUnusedTransferFields() {
        String json="{\"approved\":true,\"fullName\":\"Synthetic Name\",\"reason\":\"checked\",\"version\":5}";
        var request=JsonMapper.builder().build().readValue(json,IdentityService.Review.class);
        assertFalse(request.transferIdentity());assertTrue(request.approved());
    }
}
