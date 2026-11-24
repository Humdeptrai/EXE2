package com.handsfree.be.matching;

import com.handsfree.be.entity.PlatformSettings;
import com.handsfree.be.entity.User;
import com.handsfree.be.exception.AppException;
import com.handsfree.be.exception.ErrorCode;
import com.handsfree.be.repository.IdentityRepository;
import com.handsfree.be.repository.PlatformSettingsRepository;
import com.handsfree.be.serviceImpl.AccountAccess;
import com.handsfree.be.serviceImpl.IdentityServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MatchingRequirementsTest {
    @Mock IdentityRepository identities;
    @Mock PlatformSettingsRepository matchingSettings;
    @Mock AccountAccess access;
    @InjectMocks IdentityServiceImpl identity;

    @Test void registrationOnlyIsEligibleWhenOffButNeverMarkedVerified() {
        UUID id = UUID.randomUUID();
        when(access.active(id)).thenReturn(User.builder().id(id).active(true).build());
        when(identities.findStateByUserId(id)).thenReturn(Optional.empty());
        var settings = new PlatformSettings(); settings.setMatchingRequirementsEnabled(false);
        when(matchingSettings.findById(1)).thenReturn(Optional.of(settings));
        var result = identity.eligibility(id);
        assertTrue(result.eligible()); assertFalse(result.matchingRequirementsEnabled());
        assertFalse(result.profileComplete()); assertFalse(result.identityVerified());
        assertFalse(result.selfieVerified()); assertFalse(result.documentConfirmed());
        assertDoesNotThrow(() -> identity.requireVerified(id));
        verify(identities, never()).save(any()); // No write to identity records.
    }

    @Test void turningBackOnImmediatelyBlocksNewActionsForUnverifiedUser() {
        UUID id = UUID.randomUUID();
        when(access.active(id)).thenReturn(User.builder().id(id).active(true).build());
        when(identities.findStateByUserId(id)).thenReturn(Optional.empty());
        var settings = new PlatformSettings(); settings.setMatchingRequirementsEnabled(false);
        when(matchingSettings.findById(1)).thenReturn(Optional.of(settings));
        assertDoesNotThrow(() -> identity.requireVerified(id));
        settings.setMatchingRequirementsEnabled(true);
        assertFalse(identity.eligibility(id).eligible());
        assertEquals(ErrorCode.IDENTITY_REQUIRED, assertThrows(AppException.class, () -> identity.requireVerified(id)).getErrorCode());
    }

    @Test void missingSettingsDefaultsToRequiringVerification() {
        UUID id = UUID.randomUUID();
        when(access.active(id)).thenReturn(User.builder().id(id).active(true).build());
        when(identities.findStateByUserId(id)).thenReturn(Optional.empty());
        when(matchingSettings.findById(1)).thenReturn(Optional.empty());
        assertTrue(identity.eligibility(id).matchingRequirementsEnabled());
        assertThrows(AppException.class, () -> identity.requireVerified(id));
    }

    @Test void disabledAccountIsBlockedEvenWhenRequirementsAreOff() {
        UUID id = UUID.randomUUID();
        when(access.active(id)).thenThrow(new AppException(ErrorCode.USER_DISABLED));
        assertEquals(ErrorCode.USER_DISABLED, assertThrows(AppException.class, () -> identity.requireVerified(id)).getErrorCode());
        verifyNoInteractions(matchingSettings, identities);
    }

    @Test void verifiedIdentityStillNeedsProfileWhenOn() {
        UUID id = UUID.randomUUID();
        when(access.active(id)).thenReturn(User.builder().id(id).active(true).fullName("Test User").build());
        var record = mock(IdentityRepository.State.class);
        when(record.getStatus()).thenReturn("VERIFIED");
        when(record.getSelfieVerifiedAt()).thenReturn(Instant.now());
        when(record.getDocumentNumberConfirmedAt()).thenReturn(Instant.now());
        when(identities.findStateByUserId(id)).thenReturn(Optional.of(record));
        when(matchingSettings.findById(1)).thenReturn(Optional.of(new PlatformSettings()));
        assertEquals(ErrorCode.PROFILE_REQUIRED, assertThrows(AppException.class, () -> identity.requireVerified(id)).getErrorCode());
    }
}
