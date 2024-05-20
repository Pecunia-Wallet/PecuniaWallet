package com.pecuniawallet.crypto.base;

/**
 * The network that contains only one coin (and it isn't possible to register a new one on it).
 *
 * @see Network
 * @see Coin
 * @see SingleCoinMultiAddrNetwork
 */
public interface SingleCoinNetwork extends Coin, Network {

    @Override
    default Network network() {
        return this;
    }
}
