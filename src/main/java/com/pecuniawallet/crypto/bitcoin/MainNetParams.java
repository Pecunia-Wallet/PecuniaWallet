package com.pecuniawallet.crypto.bitcoin;

import org.bitcoinj.core.Block;
import org.bitcoinj.core.StoredBlock;
import org.bitcoinj.core.VerificationException;
import org.bitcoinj.store.BlockStore;
import org.bitcoinj.store.BlockStoreException;

public class MainNetParams extends org.bitcoinj.params.MainNetParams {

    @Override
    public void checkDifficultyTransitions(StoredBlock storedPrev, Block nextBlock, BlockStore blockStore) throws VerificationException, BlockStoreException {
        try {
            super.checkDifficultyTransitions(storedPrev, nextBlock, blockStore);
        } catch (VerificationException _) {}
    }
}
