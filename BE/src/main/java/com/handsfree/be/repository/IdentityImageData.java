package com.handsfree.be.repository;

/** Select one encrypted image, rather than hydrating its entire owning entity. */
public interface IdentityImageData { byte[] getData(); }
