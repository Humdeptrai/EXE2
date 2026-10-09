package com.handsfree.be.storage;
import java.io.InputStream;
public record PrivateReportFile(InputStream stream, String contentType, String originalName, long sizeBytes) {}
