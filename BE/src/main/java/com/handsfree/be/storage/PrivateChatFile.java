package com.handsfree.be.storage;
import java.io.InputStream;
public record PrivateChatFile(InputStream stream, String contentType, String originalName, long sizeBytes) {}
