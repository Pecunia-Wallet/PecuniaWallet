package com.pecuniawallet.rest;

import com.pecuniawallet.crypto.base.Coin;
import com.pecuniawallet.crypto.base.MultiAddrNetwork;
import com.pecuniawallet.crypto.base.Transaction;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.repo.WalletRepository;
import com.pecuniawallet.types.*;
import com.pecuniawallet.util.AuthenticationUtils;
import com.pecuniawallet.util.HttpUtils;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.val;
import org.apache.commons.lang3.StringUtils;
import org.bitcoinj.base.exceptions.AddressFormatException;
import org.bitcoinj.core.InsufficientMoneyException;
import org.bitcoinj.wallet.Wallet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/wallet/{coinShortName}")
public class WalletController {

    @Autowired List<Coin> coins;
    @Autowired WalletRepository walletRepo;

    private Coin acclaimCoin(String shortName, HttpServletResponse response) {
        return coins.stream()
                .filter(coin -> coin.getAbbreviation().equalsIgnoreCase(shortName))
                .findAny()
                .orElseGet(() -> {
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    return null;
                });
    }

    private WalletEntity getWallet(HttpServletResponse response) {
        val wallet = AuthenticationUtils.getAuthenticationToken().getWallet();
        if (wallet == null) HttpUtils.returnWithStatus(response, HttpStatus.UNAUTHORIZED);
        return wallet;
    }

    @GetMapping("/sync")
    public boolean isWalletInitializing(
            @PathVariable String coinShortName, HttpServletResponse response) {
        if (!coinShortName.equalsIgnoreCase("any")) return HttpUtils
                .returnWithStatus(response, HttpStatus.BAD_REQUEST);
        val wallet = getWallet(response);
        if (wallet == null) return false;
        walletRepo.updateLastAccess(wallet);
        return wallet.isInitializing();
    }

    @GetMapping("/balance")
    public BigDecimal getBalance(
            @PathVariable String coinShortName,
            @RequestParam(defaultValue = "AVAILABLE") BalanceType type,
            HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return null;
        walletRepo.updateLastAccess(wallet);
        return switch (type) {
            case AVAILABLE -> coin.getAvailableBalance(wallet);
            case ESTIMATED -> coin.getEstimatedBalance(wallet);
        };
    }

    @GetMapping("/info")
    public CoinInfo getCoinInfo(@PathVariable String coinShortName, HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        if (coin == null) return null;
        if (coin instanceof MultiAddrNetwork multiAddrNetwork)
            return new CoinInfo(coin.network().getName(), coin.getName(),
                    multiAddrNetwork.types(), Optional.of(multiAddrNetwork.defaultType()));
        else return new CoinInfo(coin.network().getName(), coin.getName(),
                Collections.singleton("default"), Optional.empty());
    }

    @GetMapping("/addr")
    public String getCurrentAddress(
            @PathVariable String coinShortName,
            @RequestParam(required = false) String type,
            HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return null;
        walletRepo.updateLastAccess(wallet);
        if (type != null) {
            val netName = StringUtils.capitalize(coin.getName().toLowerCase());
            if (coin.network() instanceof MultiAddrNetwork multiAddrnetwork) {
                try {
                    if (type.equalsIgnoreCase("default"))
                        return multiAddrnetwork.currentReceiveAddress(wallet);
                    else return multiAddrnetwork.currentReceiveAddress(wallet, type);
                } catch (IllegalArgumentException e) {
                    response.setStatus(HttpStatus.BAD_REQUEST.value());
                    return STR."Bad type given. \{netName} supports the next types: \{multiAddrnetwork.types()}";
                }
            } else if (!type.equalsIgnoreCase("default")) {
                return STR."Network \{netName} have only one address type. Pass 'default' as type or don't specify it";
            }
        }
        return coin.network().currentReceiveAddress(wallet);
    }

    @GetMapping("/txs")
    public List<Transaction> getWalletTransactions(
            @PathVariable String coinShortName,
            @RequestParam(value = "orderBy", required = false) TransactionOrderField orderBy,
            @RequestParam(value = "orderDir", defaultValue = "ASC") OrderDirection orderDir,
            @RequestParam(value = "pageSize", required = false) Integer pageSize,
            @RequestParam(value = "pageOffset", required = false) Integer pageOffset,
            HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return null;

        walletRepo.updateLastAccess(wallet);
        List<Transaction> txs = new ArrayList<>(coin.getTransactions(wallet));
        if (orderBy != null) {
            txs = txs.stream()
                    .sorted(orderBy.comparator())
                    .collect(Collectors.toList());
            if (orderDir == OrderDirection.DESC) Collections.reverse(txs);
        }
        if (pageSize == null || pageSize < 0) pageSize = txs.size();
        if (pageOffset == null || pageOffset < 0) pageOffset = 0;

        int itemsRemaining = Math.max(0, txs.size() - pageSize * (pageOffset + 1));
        response.setHeader("X-Items-Remaining", String.valueOf(itemsRemaining));

        return new Page<Transaction>(pageSize, pageOffset).of(txs);
    }

    @GetMapping("/tx/{id}")
    public Transaction getWalletTransaction(
            @PathVariable String coinShortName,
            @PathVariable String id,
            HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return null;
        walletRepo.updateLastAccess(wallet);

        return coin.getTransactions(wallet).stream()
                .filter(tx -> tx.getId().equalsIgnoreCase(id))
                .findAny()
                .orElseGet(() -> HttpUtils.returnWithStatus(response, HttpStatus.NOT_FOUND));
    }

    @PostMapping("/import")
    public boolean importKeys(@PathVariable String coinShortName,
                              @RequestBody List<String> keys,
                              HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return false;
        walletRepo.updateLastAccess(wallet);
        return coin.importPrivateKeys(wallet, keys);
    }

    @GetMapping("/export")
    public byte[] exportWallet(@PathVariable String coinShortName, HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return null;
        walletRepo.updateLastAccess(wallet);
        val baos = new ByteArrayOutputStream();
        try (val bos = new BufferedOutputStream(baos)) {
            coin.exportWallet(wallet, bos);
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @GetMapping("/fees")
    public Map<Integer, BigDecimal> getFeeEstimates(
            @PathVariable String coinShortName, HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        if (coin == null) return null;
        return coin.feeEstimates();
    }

    @PostMapping("/tx")
    public Map<String, Object> createTransaction(
            @PathVariable String coinShortName,
            @Valid @RequestBody TransactionRequest txr,
            HttpServletResponse response) {
        val coin = acclaimCoin(coinShortName, response);
        val wallet = getWallet(response);
        if (coin == null || wallet == null) return Collections
                .singletonMap("code", TransactionError.BAD_COIN.code);
        walletRepo.updateLastAccess(wallet);
        TransactionError error = null;
        String txId = null;
        try {
            txId = txr.getFee() == null
                    ? coin.send(wallet, txr.getOutputs())
                    : coin.sendWithFee(wallet, txr.getOutputs(), txr.getFee(), txr.isRecipientsPayFees());
        } catch (AddressFormatException e) {
            error = TransactionError.MALFORMED_ADDRESS;
        } catch (IllegalArgumentException e) {
            error = TransactionError.EMPTY_OUTPUTS;
        } catch (Wallet.DustySendRequested e) {
            error = TransactionError.DUSTY_REQUEST;
        } catch (InsufficientMoneyException e) {
            error = TransactionError.INSUFFICIENT_MONEY;
        }
        val result = new HashMap<String, Object>(Map.of("code", error != null ? error.code : 0));
        if (txId != null) result.put("txId", txId);
        return result;
    }

}
