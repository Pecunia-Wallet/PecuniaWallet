package com.pecuniawallet.crypto.base;

/**
 * The network that contains only one coin on it (and it isn't possible
 * to register a new one on it) and has several ways of address representation.
 *
 * @see Network
 * @see MultiAddrNetwork
 * @see Coin
 */
public interface SingleCoinMultiAddrNetwork extends Coin, SingleCoinNetwork, MultiAddrNetwork {}
