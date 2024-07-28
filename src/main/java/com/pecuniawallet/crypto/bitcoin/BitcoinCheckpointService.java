package com.pecuniawallet.crypto.bitcoin;

import jakarta.annotation.PostConstruct;
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
        val checkpointsDir = new File(appDir, "checkpoints");
        if (!checkpointsDir.exists()) checkpointsDir.mkdir();
        checkpointsFile = new File(checkpointsDir, "%s.btc.checkpoints"
                .formatted(testnet ? "test" : "main"));
    }

    @PostConstruct
    void init() {
        if (!checkpointsFile.exists()) renewCheckpoints();
        reloadCheckpointsFromDisk();
    }

    private synchronized void reloadCheckpointsFromDisk() {
        if (!checkpointsFile.exists()) {
            checkpoints = new byte[]{};
            return;
        }
        try (val fis = new FileInputStream(checkpointsFile)) {
            log.info("Loading checkpoints from file...");
            val baos = new ByteArrayOutputStream();
            fis.transferTo(baos);
            checkpoints = baos.toByteArray();
            baos.close();
            log.info("Checkpoints loaded with size {}", checkpoints.length);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public synchronized InputStream getCheckpoints() {
        log.info("Accessing checkpoints (length: {})", checkpoints.length);
        return new BufferedInputStream(new ByteArrayInputStream(checkpoints));
    }

    @Scheduled(fixedRate = 2, timeUnit = TimeUnit.HOURS)
    public void renewCheckpoints() {
        renewCheckpoints(0);
    }

    void renewCheckpoints(int aTry) {
        log.info("Renewing checkpoints...");
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
        } catch (Exception e) {
            log.error("Unknown error", e);
        }
    }

}
