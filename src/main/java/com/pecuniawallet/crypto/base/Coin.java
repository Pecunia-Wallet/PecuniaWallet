package com.pecuniawallet.crypto.base;

import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.model.WalletInitializationStateChangedEvent;
import lombok.EqualsAndHashCode;
import lombok.NonNull;
import org.apache.commons.codec.binary.Hex;
import org.bitcoinj.base.exceptions.AddressFormatException;
import org.bitcoinj.core.InsufficientMoneyException;
import org.bitcoinj.wallet.Wallet;
import org.jetbrains.annotations.Contract;
import org.jetbrains.annotations.Nullable;
import org.springframework.scheduling.annotation.Async;

import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Every coin has its own blockchain and contains methods
 * unique (returning different values) for every coin.
 *
 * @see SingleCoinNetwork
 * @see MultiAddrNetwork
 */
public interface Coin {

    /**
     * @return the network this coin is related to
     */
    @NonNull Network network();

    /**
     * @return the full token's name, e.g. "Bitcoin"
     */
    String getName();

    /**
     * @return token's abbreviation, e.g, "BTC"
     */
    String getAbbreviation();

    /**
     * @return number of coin's decimal places i.e., how much is the token divisible to
     */
    int getDecimals();

    /**
     * Synchronizes the wallet with the network. This is
     * necessary before using methods that receive info from
     * blockchain (or other external sources) to get the latest state.
     * Note that implementors most likely automatically call this method,
     * so you probably want to call it only to prepare wallet for future use.
     * If the sync process is going to be long, the coin should publish
     * {@link WalletInitializationStateChangedEvent}
     */
    void syncWallet(@NonNull WalletEntity wallet);

    /**
     * Async version of {@link #syncWallet(WalletEntity)}
     */
    @Async
    void syncWalletAsync(@NonNull WalletEntity wallet);

    boolean importPrivateKeys(@NonNull WalletEntity wallet, List<String> keys);

    /**
     * @return set of wallet's transactions
     */
    Set<Transaction> getTransactions(@NonNull WalletEntity wallet);

    /**
     * @return overall available wallet's balance on the token's blockchain.
     */
    BigDecimal getAvailableBalance(@NonNull WalletEntity wallet);

    /**
     * @param addr address belonging to the wallet
     * @return address' balance available for spend
     * @throws IllegalArgumentException if the address doesn't belong to the wallet
     * @throws AddressFormatException if an address is malformed
     */
    BigDecimal getAvailableBalance(@NonNull WalletEntity wallet, @NonNull String addr)
            throws AddressFormatException, IllegalArgumentException;

    /**
     * @return overall estimated wallet's balance on the token's blockchain
     */
    BigDecimal getEstimatedBalance(@NonNull WalletEntity wallet);

    /**
     * @param outputs pairs of target address and amount to be sent. Can't be empty
     * @throws AddressFormatException   if an address is malformed
     * @throws IllegalArgumentException if the outputs not present
     */
    String send(@NonNull WalletEntity wallet, @NonNull Map<String, BigDecimal> outputs)
            throws AddressFormatException, IllegalArgumentException,
            Wallet.DustySendRequested, InsufficientMoneyException;

    /**
     * @param outputs pairs of target address and amount to be sent. Can't be empty
     * @param fee     relative fee for broadcasting the transaction. For static fee call
     *                If null or non-positive, the behavior
     *                will be equal to {@link #send(WalletEntity, Map)}
     *                (most likely the fee would be set automatically)
     */
    String sendWithFee(@NonNull WalletEntity wallet,
                       @NonNull Map<String, BigDecimal> outputs,
                       @Nullable BigDecimal fee, boolean recipientsPayFees)
            throws AddressFormatException, IllegalArgumentException,
            Wallet.DustySendRequested, InsufficientMoneyException;


    default String sendWithFee(@NonNull WalletEntity wallet,
                               @NonNull Map<String, BigDecimal> outputs,
                               @Nullable BigDecimal fee)
            throws AddressFormatException, IllegalArgumentException,
            Wallet.DustySendRequested, InsufficientMoneyException {
        return sendWithFee(wallet, outputs, fee, false);
    }

    /**
     * @return blocks-fees map, where block is the estimated inclusion blocks
     * if a transaction uses the corresponding fee
     */
    Map<Integer, BigDecimal> feeEstimates();

    /**
     * Exports the wallet in human-readable format to the stream.
     */
    void exportWallet(@NonNull WalletEntity wallet, @NonNull OutputStream os);

}
