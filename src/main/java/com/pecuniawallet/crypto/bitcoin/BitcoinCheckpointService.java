package com.pecuniawallet.crypto.bitcoin;

import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
class BitcoinCheckpointService {

    @Autowired private BitcoinCheckpointBuilder checkpointBuilder;

    private final File checkpointsFile;
    private volatile byte[] checkpoints;

    public BitcoinCheckpointService(
            @Value("${app.testnet}") boolean testnet,
            @Value("${app.dir}") String appDir) {
        checkpointsFile = new File(appDir, "checkpoints/%s.btc.checkpoints"
                .formatted(testnet ? "test" : "main"));
        if (!checkpointsFile.exists()) renewCheckpoints(0);
        reloadCheckpointsFromDisk();
    }

    private synchronized void reloadCheckpointsFromDisk() {
        try (val fis = new FileInputStream(checkpointsFile)) {
            log.info("Loading checkpoints from file...");
            val baos = new ByteArrayOutputStream();
            fis.transferTo(baos);
            checkpoints = baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public synchronized InputStream getCheckpoints() {
        log.info("Accessing checkpoints (length: {})", checkpoints.length);
        return new ByteArrayInputStream(checkpoints);
    }

    @Scheduled(fixedRate = 2, initialDelay = 1, timeUnit = TimeUnit.HOURS)
    public @Async void renewCheckpoints() {
        renewCheckpoints(0);
    }

    void renewCheckpoints(int aTry) {
        log.info("Renewing checkpoint");
        final byte maxTries = 4;
        if (aTry > maxTries) return;
        try {
            CountDownLatch latch = new CountDownLatch(1);
            CompletableFuture.runAsync(() -> {
                try {
                    checkpointBuilder.buildCheckpoints();
                    latch.countDown();
                } catch (Exception e) {
                    log.error("Failed to renew checkpoints", e);
                }
            });
            if (!latch.await(1, TimeUnit.MINUTES)) {
                log.warn("Failed to checkpoint: timed out");
                if (++aTry < maxTries) renewCheckpoints(aTry);
            }
            reloadCheckpointsFromDisk();
        } catch (InterruptedException e) {
            if (++aTry < maxTries) renewCheckpoints(aTry);
        }
    }

}
