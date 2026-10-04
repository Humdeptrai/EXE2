package com.handsfree.be.storage;

import com.handsfree.be.service.MediaStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Upload only file bytes on workers; database work stays on the transaction thread. */
@Component
@RequiredArgsConstructor
public class JobImageBatchUploader {
    private final MediaStorageService storage;

    public List<StoredFile> upload(List<MultipartFile> files) {
        ExecutorService workers = Executors.newFixedThreadPool(Math.min(3, files.size()));
        List<CompletableFuture<StoredFile>> pending = new ArrayList<>();
        List<StoredFile> uploaded = new ArrayList<>();
        RuntimeException failure = null;
        try {
            for (MultipartFile file : files) {
                pending.add(CompletableFuture.supplyAsync(() -> storage.storeJobImage(file), workers));
            }
            // Wait for every upload, including after a failure, before cleaning up successes.
            // Joining in input order also preserves the user's selected image order.
            for (CompletableFuture<StoredFile> task : pending) {
                try {
                    uploaded.add(task.join());
                } catch (CompletionException exception) {
                    if (failure == null) {
                        failure = exception.getCause() instanceof RuntimeException cause
                                ? cause : exception;
                    }
                }
            }
            if (failure != null) {
                for (StoredFile file : uploaded) {
                    try {
                        storage.delete(file.storedName());
                    } catch (RuntimeException cleanupFailure) {
                        failure.addSuppressed(cleanupFailure);
                    }
                }
                throw failure;
            }
            return uploaded;
        } finally {
            workers.shutdown();
        }
    }
}
