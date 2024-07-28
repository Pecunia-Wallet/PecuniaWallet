package com.pecuniawallet.crypto.bitcoin;

import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.bitcoinj.wallet.Wallet;
import org.bitcoinj.wallet.WalletExtension;

import java.nio.charset.StandardCharsets;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Instant;

@Slf4j
public class SyncWalletExtension implements WalletExtension {

    @Setter private Timestamp lastSyncTime;
    private Wallet wallet;

    public static String id() {
        return "syncTimeMemorizer";
    }

    @Override
    public String getWalletExtensionID() {
        return id();
    }

    @Override
    public boolean isWalletExtensionMandatory() {
        return true;
    }

    @Override
    public byte[] serializeWalletExtension() {
        if (lastSyncTime != null) {
            log.debug("Serializing as {}", lastSyncTime);
            return lastSyncTime.toString().getBytes(StandardCharsets.UTF_8);
        }
        return new byte[]{};
    }

    @Override
    public void deserializeWalletExtension(Wallet containingWallet, byte[] data) throws Exception {
        log.debug("Deserializing from payload {}", new String(data, StandardCharsets.UTF_8));
        try {
            lastSyncTime = Timestamp.valueOf(new String(data, StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            log.error("Bad payload {}", new String(data, StandardCharsets.UTF_8));
        }
        wallet = containingWallet;
    }

    public Instant getLastSyncTime() {
        if (lastSyncTime != null) return lastSyncTime.toInstant();
        if (wallet == null) return null;
        return wallet.lastBlockSeenTime().orElse(null);
    }

}
