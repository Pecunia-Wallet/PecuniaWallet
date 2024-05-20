package com.pecuniawallet.service;

import com.pecuniawallet.model.WalletEntity;
import jakarta.annotation.Nullable;
import lombok.extern.log4j.Log4j2;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.aopalliance.intercept.MethodInterceptor;
import org.aopalliance.intercept.MethodInvocation;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.jetbrains.annotations.NotNull;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

@Slf4j
@Aspect
@Service
public class WalletService {

    private final Set<Consumer<WalletEntity>> walletSavedListeners = new HashSet<>();
    private final Executor listenersExecutor = Executors.newSingleThreadExecutor();

    @Around("execution(public * com.pecuniawallet.repo.WalletRepository+.save(com.pecuniawallet.model.WalletEntity))")
    public final WalletEntity saveAspect(ProceedingJoinPoint joinPoint) throws Throwable {
        val wallet = (WalletEntity) joinPoint.proceed();
        setWalletLastAccess(wallet);
        walletSavedListeners.forEach(listener -> CompletableFuture.runAsync(() ->
                listener.accept(wallet), listenersExecutor));
        return wallet;
    }

    @Around("execution(public * com.pecuniawallet.repo.WalletRepository+.find*(..))")
    public final WalletEntity findAspect(ProceedingJoinPoint joinPoint) throws Throwable {
        val wallet = (WalletEntity) joinPoint.proceed();
        if (wallet == null) return null;
        setWalletLastAccess(wallet);
        return wallet;
    }

    /**
     * @param listener listener to be called when the wallet saved. Gets the saved wallet as argument
     * @param target the target wallet. Listener is called only if saved wallet's id is equal to target's
     */
    public void addWalletSavedListener(Consumer<WalletEntity> listener, WalletEntity target) {
        walletSavedListeners.add(wallet -> {
            if (target.getId().equals(wallet.getId()))
                listener.accept(wallet);
        });
    }

    /**
     * @param listener listener to be called when the wallet saved. Gets the saved wallet as argument
     */
    public void addWalletSavedListener(Consumer<WalletEntity> listener) {
        walletSavedListeners.add(listener);
    }

    public void removeWalletSavedListener(Consumer<WalletEntity> listener) {
        walletSavedListeners.remove(listener);
    }

    private void setWalletLastAccess(WalletEntity wallet) {
        try {
            val lastAccessField = wallet.getClass().getDeclaredField("lastAccess");
            lastAccessField.setAccessible(true);
            lastAccessField.set(wallet, new Timestamp(System.currentTimeMillis()));
        } catch (Exception e) {
            log.warn("Failed to set wallet last access", e);
        }
    }
}
