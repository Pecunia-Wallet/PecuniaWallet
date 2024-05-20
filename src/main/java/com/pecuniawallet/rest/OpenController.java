package com.pecuniawallet.rest;

import com.pecuniawallet.crypto.base.Coin;
import com.pecuniawallet.model.Token;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.util.HttpUtils;
import jakarta.servlet.http.HttpServletResponse;
import com.pecuniawallet.repo.WalletRepository;
import com.pecuniawallet.service.TokenService;
import lombok.val;
import org.bitcoinj.crypto.MnemonicCode;
import org.bitcoinj.crypto.MnemonicException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@RestController
public class OpenController {

    @Autowired WalletRepository walletRepo;
    @Autowired TokenService tokenService;
    @Autowired List<Coin> coins;

    @Value("${lock.token.max}") Integer maxLockTokens;
    @Value("${lock.cookie.name}") String lockCookieName;

    @PostMapping("/open")
    public void openExistingWallet(
            @RequestBody Map<String, String> body,
            HttpServletResponse response) {
        String mnemonic = body.get("mnemonic");
        if (!HttpUtils.reqNonNull(response, mnemonic)) return;
        mnemonic = mnemonic
                .replaceAll("[^a-zA-Z]", " ")
                .replaceAll(" +", " ");

        WalletEntity wallet = walletRepo.findByMnemonic(mnemonic);
        boolean existingWallet = wallet != null;

        if (existingWallet) {
            if (wallet.getTokens() != null) {
                val lockTokens = new ArrayList<>(wallet.getTokens().stream()
                        .filter(t -> t.getType().equals(Token.Type.LOCK))
                        .sorted(Comparator.comparing(Token::getExpires).reversed())
                        .toList());
                if (lockTokens.size() >= maxLockTokens) {
                    lockTokens.removeLast();
                    lockTokens.addAll(wallet.getTokens().stream()
                            .filter(t -> t.getType().equals(Token.Type.ACCESS)).toList());
                    wallet.setTokens(new HashSet<>(lockTokens));
                }
            }
        } else {
            try {
                MnemonicCode.INSTANCE.check(Arrays.stream(mnemonic.split(" ")).toList());
            } catch (MnemonicException e) {
                HttpUtils.returnWithStatus(response, HttpStatus.BAD_REQUEST);
                return;
            }
            wallet = new WalletEntity();
            wallet.setExternal(true);
        }

        wallet.setLastAccess(Timestamp.valueOf(LocalDateTime.now()));
        if (wallet.getTokens() == null) wallet.setTokens(new HashSet<>());
        Token token = tokenService.generateTokenAndSave(Token.Type.LOCK);
        wallet.getTokens().add(token);
        walletRepo.save(wallet);

        val finalWallet = wallet;
        CompletableFuture.runAsync(() ->
                coins.forEach(coin -> coin.syncWallet(finalWallet)));

        tokenService.saveToCookie(response, token);
    }

}
