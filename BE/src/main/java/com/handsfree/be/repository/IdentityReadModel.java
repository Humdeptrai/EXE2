package com.handsfree.be.repository;

import java.time.Instant;

/** Small encrypted fields and presence flags only; never select image/checkpoint payloads here. */
public interface IdentityReadModel {
    long getVersion();
    String getStatus(); String getReason();
    Instant getSubmittedAt(); Instant getVerifiedAt();
    Instant getSelfieVerifiedAt(); Instant getDocumentNumberConfirmedAt();
    byte[] getDocumentNumber(); byte[] getFullName();
    boolean getHasSelfie(); boolean getHasFace(); boolean getHasFront(); boolean getHasBack();
}
