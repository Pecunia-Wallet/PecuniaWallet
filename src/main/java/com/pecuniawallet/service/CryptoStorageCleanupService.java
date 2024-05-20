package com.pecuniawallet.service;

import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.attribute.FileTime;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class CryptoStorageCleanupService {

    @Value("${app.dir}") File appDir;

    public CryptoStorageCleanupService(@Value("${app.dir}") String appDir) {
        this.appDir = new File(appDir);
    }

    private void deleteFilesWithPrefixInDirOlderThan(String prefix, File dir, long millis) {
        prefix = prefix.toLowerCase();
        if (!dir.isDirectory() || dir.listFiles() == null) return;
        assert dir.listFiles() != null;
        for (val file : dir.listFiles()) {
            if (file.isDirectory()) {
                deleteFilesWithPrefixInDirOlderThan(prefix, new File(dir, file.getName()), millis);
                continue;
            }
            if (file.getName().toLowerCase().startsWith(prefix)) {
                try {
                    FileTime creationTime = (FileTime) Files.getAttribute(file.toPath(), "creationTime");
                    if (creationTime == null)
                        creationTime = (FileTime) Files.getAttribute(file.toPath(), "crtime");
                    if (creationTime == null)
                        creationTime = (FileTime) Files.getAttribute(file.toPath(), "otime");
                    if (creationTime == null)
                        creationTime = (FileTime) Files.getAttribute(file.toPath(), "di_otime");
                    if (creationTime == null || new Date().getTime() - creationTime.toMillis() >= millis)
                        if (!file.delete()) log.warn("Failed to delete file: {}", file.getName());
                } catch (IOException e) {
                    log.warn("Failed to delete file", e);
                }
            }
        }
    }

    @Scheduled(fixedRate = 1, timeUnit = TimeUnit.HOURS)
    public @Async void deleteOutdatedExtraFiles() {
        deleteFilesWithPrefixInDirOlderThan("extra-", appDir, TimeUnit.DAYS.toMillis(1));
    }

    @Scheduled(fixedRate = 15, timeUnit = TimeUnit.MINUTES)
    public @Async void deleteOutdatedTempFiles() {
        deleteFilesWithPrefixInDirOlderThan("tmp-", appDir, TimeUnit.MINUTES.toMillis(30));
    }

}
