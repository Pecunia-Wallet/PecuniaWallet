package com.pecuniawallet.crypto.base;

import com.pecuniawallet.model.WalletEntity;
import jakarta.annotation.Nullable;
import lombok.NonNull;
import org.bitcoinj.base.exceptions.AddressFormatException;
import org.bitcoinj.core.InsufficientMoneyException;
import org.bitcoinj.wallet.Wallet;
import org.jetbrains.annotations.Contract;
import org.springframework.scheduling.annotation.Async;

import java.io.OutputStream;
import java.math.BigInteger;
import java.util.Set;

/**
 * Every coin has its own blockchain and contains methods
 * unique (returning different values) for every coin.
 *
 * @see SingleCoinNetwork
 * @see SingleCoinMultiAddrNetwork
 */
public interface Coin {

    /**
     * @return the network this coin is related to
     */
    @Contract("->!null")
    Network network();

    /**
     * @return the full token's name, e.g. "Bitcoin"
     */
    String getName();

    /**
     * @return token's abbreviation, e.g, "BTC"
     */
    String getAbbreviation();

    /**
     * Synchronizes the wallet with the network. This is
     * necessary before using methods that receive info from
     * blockchain (or other external sources) in order to get
     * the latest state. Note that other most likely automatically
     * calls this method, so you probably want to call it only to
     * prepare wallet for future use.
     */
    void syncWallet(@NonNull WalletEntity wallet);

    /**
     * Async version of {@link #syncWallet(WalletEntity)}
     */
    @Async
    void syncWalletAsync(@NonNull WalletEntity wallet);

    /**
     * @return set of wallet's transactions
     */
    Set<Transaction> getTransactions(@NonNull WalletEntity wallet);

    /**
     * @return overall available wallet's balance on the token's blockchain.
     */
    BigInteger getAvailableBalance(@NonNull WalletEntity wallet);

    /**
     * @param addr address belonging to the wallet
     * @return address' balance available for spend
     * @throws IllegalArgumentException if the address doesn't belong to the wallet
     * @throws AddressFormatException
     */
    BigInteger getAvailableBalance(@NonNull WalletEntity wallet, @NonNull String addr)
            throws AddressFormatException, IllegalArgumentException;

    /**
     * @return overall estimated wallet's balance on the token's blockchain
     */
    BigInteger getEstimatedBalance(@NonNull WalletEntity wallet);

    /**
     * @param target target address
     * @param amount amount to send
     */
    boolean send(@NonNull WalletEntity wallet, @NonNull String target, @NonNull BigInteger amount)
            throws AddressFormatException, Wallet.DustySendRequested, InsufficientMoneyException;

    /**
     * @param target target address
     * @param amount amount to send
     * @param fee    fee for broadcasting the transaction. If null or non-positive, the behavior
     *               will be equal to {@link #send(WalletEntity, String, BigInteger)}
     *               (most likely the fee would be set automatically)
     */
    boolean sendWithFee(@NonNull WalletEntity wallet, @NonNull String target,
                        @NonNull BigInteger amount, @Nullable BigInteger fee)
            throws AddressFormatException, Wallet.DustySendRequested, InsufficientMoneyException;

    /**
     * Exports the wallet in human-readable format to the stream.
     */
    boolean exportWallet(@NonNull WalletEntity wallet, @NonNull OutputStream os);

}
