package com.handsfree.be.storage;
import java.io.InputStream;
/** A null stream with an ETag means authenticated conditional GET matched. */
public record PrivateChatFile(InputStream stream, String contentType, String originalName, long sizeBytes, String etag) {}
