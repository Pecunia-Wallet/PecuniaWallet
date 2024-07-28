package com.pecuniawallet.crypto.bitcoin;

import lombok.extern.slf4j.Slf4j;
import org.bitcoinj.base.Network;
import org.bitcoinj.core.StoredBlock;
import org.bitcoinj.core.VerificationException;
import org.bitcoinj.wallet.KeyChainGroup;
import org.bitcoinj.wallet.Wallet;
import org.bitcoinj.wallet.WalletTransaction;

import java.util.List;

@Slf4j
public class FWallet extends Wallet {
    public FWallet(Network network, KeyChainGroup keyChainGroup) {
        super(network, keyChainGroup);
    }

    @Override
    public void reorganize(StoredBlock splitPoint, List<StoredBlock> oldBlocks, List<StoredBlock> newBlocks) throws VerificationException {
        try {
            super.reorganize(splitPoint, oldBlocks, newBlocks);
        } catch (IllegalStateException e) {
            log.warn("Caught wallet exception", e);
        }
    }
}
