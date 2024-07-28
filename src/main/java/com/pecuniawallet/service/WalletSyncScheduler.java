package com.pecuniawallet.service;

import com.pecuniawallet.crypto.base.Coin;
import com.pecuniawallet.repo.WalletRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class WalletSyncScheduler {

    @Autowired WalletRepository walletRepo;
    @Autowired List<Coin> coins;

    Executor synchronizationExecutor = Executors.newFixedThreadPool(5);

    @Scheduled(fixedRate = 8, timeUnit = TimeUnit.HOURS)
    public void syncAllWallets() {
        log.info("Syncing wallets...");
        walletRepo.findAll()
                .forEach(wallet -> coins.forEach(coin -> CompletableFuture
                        .runAsync(() -> coin.syncWallet(wallet), synchronizationExecutor)));
    }

}

