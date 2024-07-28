package com.pecuniawallet.crypto.bitcoin;

import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.bitcoinj.base.BitcoinNetwork;
import org.bitcoinj.base.Sha256Hash;
import org.bitcoinj.base.internal.TimeUtils;
import org.bitcoinj.core.*;
import org.bitcoinj.params.MainNetParams;
import org.bitcoinj.params.TestNet3Params;
import org.bitcoinj.store.MemoryBlockStore;
import org.bitcoinj.utils.BriefLogFormatter;
import org.bitcoinj.utils.Threading;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.math.BigInteger;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.Buffer;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.TreeMap;

import static com.google.common.base.Preconditions.checkState;

/**
 * Converted from inner bitcoinj cli command class {@link org.bitcoinj.tools.BuildCheckpoints}.
 */
@Slf4j
@Component
public class BitcoinCheckpointBuilder {

    private final NetworkParameters params;
    private final File checkpointsFile;

    public BitcoinCheckpointBuilder(
            @Value("${app.testnet}") boolean testnet,
            @Value("${app.dir}") String appDir) {
        checkpointsFile = new File(appDir, "checkpoints/%s.btc.checkpoints"
                .formatted(testnet ? "test" : "main"));
        params = testnet ? TestNet3Params.get() : MainNetParams.get();
        BriefLogFormatter.initWithSilentBitcoinJ();
    }

    public void buildCheckpoints() throws Exception {
        Context.propagate(new Context());
        val net = params.network();

        val store = new MemoryBlockStore(params.getGenesisBlock());
        val chain = new BlockChain(net, store);
        val peerGroup = new PeerGroup(net, chain);

        startPeerGroup(peerGroup);

        val checkpoints = new TreeMap<Integer, StoredBlock>();

        Instant now = TimeUtils.currentTime();
        peerGroup.setFastCatchupTime(now);

        Instant timeAgo = now.minus(1, ChronoUnit.DAYS);
        log.info(STR."Checkpointing up to \{TimeUtils.dateTimeFormat(timeAgo)}");

        chain.addNewBestBlockListener(Threading.SAME_THREAD, block -> {
            int height = block.getHeight();
            if (height % params.getInterval() == 0 && timeAgo.isAfter(block.getHeader().time())) {
                log.info("Checkpointing block {} at height {}, time {}",
                        block.getHeader().getHash(), block.getHeight(),
                        TimeUtils.dateTimeFormat(block.getHeader().time()));
                checkpoints.put(height, block);
            }
        });

        peerGroup.downloadBlockChain();

        checkState(!checkpoints.isEmpty());

        writeTextualCheckpoints(checkpoints, checkpointsFile);

        peerGroup.stop();
        store.close();

        sanityCheck(checkpointsFile, checkpoints.size());
    }

    private static final BigInteger MAX_WORK_V1 = new BigInteger(/* 12 bytes */ "ffffffffffffffffffffffff", 16);

    private static void writeTextualCheckpoints(TreeMap<Integer, StoredBlock> checkpoints, File file)
            throws IOException {
        try (PrintWriter writer = new PrintWriter(
                new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.US_ASCII))) {
            writer.println("TXT CHECKPOINTS 1");
            writer.println("0"); // Number of signatures to read. Do this later.
            writer.println(checkpoints.size());
            ByteBuffer bufferV1 = ByteBuffer.allocate(StoredBlock.COMPACT_SERIALIZED_SIZE);
            ByteBuffer bufferV2 = ByteBuffer.allocate(StoredBlock.COMPACT_SERIALIZED_SIZE_V2);
            for (StoredBlock block : checkpoints.values()) {
                if (block.getChainWork().compareTo(MAX_WORK_V1) <= 0) {
                    ((Buffer) bufferV1).rewind();
                    block.serializeCompact(bufferV1);
                    writer.println(CheckpointManager.BASE64.encode(bufferV1.array()));
                } else {
                    ((Buffer) bufferV2).rewind();
                    block.serializeCompactV2(bufferV2);
                    writer.println(CheckpointManager.BASE64.encode(bufferV2.array()));
                }
            }
            System.out.println("Checkpoints written to '" + file.getCanonicalPath() + "'.");
        }
    }

    private void sanityCheck(File file, int expectedSize) throws IOException {
        FileInputStream fis = new FileInputStream(file);
        CheckpointManager manager;
        try {
            manager = new CheckpointManager(params, fis);
        } finally {
            fis.close();
        }

        checkState(manager.numCheckpoints() == expectedSize);

        if (params.network() == BitcoinNetwork.MAINNET) {
            StoredBlock test = manager.getCheckpointBefore(Instant.ofEpochSecond(1390500000)); // Thu Jan 23 19:00:00 CET 2014
            checkState(test.getHeight() == 280224);
            checkState(test.getHeader().getHashAsString()
                    .equals("00000000000000000b5d59a15f831e1c45cb688a4db6b0a60054d49a9997fa34"));
        } else if (params.network() == BitcoinNetwork.TESTNET) {
            StoredBlock test = manager.getCheckpointBefore(Instant.ofEpochSecond(1390500000)); // Thu Jan 23 19:00:00 CET 2014
            checkState(test.getHeight() == 167328);
            checkState(test.getHeader().getHashAsString()
                    .equals("0000000000035ae7d5025c2538067fe7adb1cf5d5d9c31b024137d9090ed13a9"));
        } else if (params.network() == BitcoinNetwork.SIGNET) {
            StoredBlock test = manager.getCheckpointBefore(Instant.ofEpochSecond(1642000000)); // 2022-01-12
            checkState(test.getHeight() == 72576);
            checkState(test.getHeader().getHashAsString()
                    .equals("0000008f763bdf23bd159a21ccf211098707671d2ca9aa72d0f586c24505c5e7"));
        }
    }

    private void startPeerGroup(PeerGroup peerGroup) throws UnknownHostException {
        final PeerAddress peerAddress = PeerAddress.simple(InetAddress.getLocalHost(), params.getPort());
        log.info(STR."Connecting to \{peerAddress}...");
        peerGroup.addAddress(peerAddress);
        peerGroup.start();
    }
}