package com.pecuniawallet.crypto.base;

import lombok.NonNull;

/**
 * The network that contains only one coin (and it isn't possible to register a new one on it).
 *
 * @see Network
 * @see Coin
 * @see SingleCoinMultiAddrNetwork
 */
public interface SingleCoinNetwork extends Coin, Network {

    @Override
    default @NonNull Network network() {
        return this;
    }

}
