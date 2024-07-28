package com.pecuniawallet.crypto.base;

import com.pecuniawallet.model.WalletEntity;
import lombok.NonNull;

import java.net.URI;

/**
 * The network holds metadata and methods universal
 * for all the coins placing on it.
 *
 * @see Coin
 * @see MultiAddrNetwork
 * @see SingleCoinNetwork
 */
public interface Network {

    /**
     * Network's name e.g. "Tron"
     */
    String getName();

    URI getImage();

    /**
     * @return an address that was never seen in any transaction
     */
    String currentReceiveAddress(@NonNull WalletEntity walletEntity);

    /**
     * @return an address that was never given by this method and will never from {@link #currentReceiveAddress(WalletEntity)}
     */
    String freshReceiveAddress(@NonNull WalletEntity walletEntity);

}
