package com.pecuniawallet.service;

import com.pecuniawallet.crypto.base.Coin;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.model.WalletInitializationStateChangedEvent;
import com.pecuniawallet.repo.WalletRepository;
import jakarta.transaction.Transactional;
import lombok.val;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class WalletInitializationStateChangedEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(WalletInitializationStateChangedEventPublisher.class);
    @Autowired ApplicationEventPublisher publisher;
    @Autowired WalletRepository walletRepo;

    Map<UUID, AtomicInteger> walletInitializers = new ConcurrentHashMap<>();

    /**
     * Publishes {@link WalletInitializationStateChangedEvent} with corresponding args
     */
    @Transactional
    public void publish(WalletEntity wallet, boolean state, Coin src) {
        log.debug("Start publishing event for wallet {} by coin {} with state {}",
                wallet.getId(), src.getName(), state);
        val walletId = wallet.getId();
        walletInitializers.compute(walletId, (_, initializers) -> {
            if (initializers == null) return new AtomicInteger(state ? 1 : 0);
            return new AtomicInteger(state
                    ? initializers.incrementAndGet()
                    : initializers.decrementAndGet());
        });
        Optional<WalletEntity> entity = walletRepo.findById(walletId);
        if (entity.isEmpty() || entity.get().isInitializing() != state) {
            val event = new WalletInitializationStateChangedEvent(wallet, state, src);
            entity.ifPresent(_ -> {
                val initializers = walletInitializers.get(walletId).get();
                log.debug("Initializers: {}", initializers);
                walletRepo.updateInitializingById(walletId, initializers > 0);
            });
            publisher.publishEvent(event);
        }
        val initializers = walletInitializers.get(walletId);
        if (initializers != null && initializers.get() <= 0)
            walletInitializers.remove(walletId);
    }

    /**
     * Placeholder for {@link #publish(WalletEntity, boolean, Coin)} with state {@code false}
     */
    @Transactional
    public void publishInitialized(WalletEntity wallet, Coin src) {
        publish(wallet, false, src);
    }

    /**
     * Placeholder for {@link #publish(WalletEntity, boolean, Coin)} with state {@code true}
     */
    @Transactional
    public void publishInitializing(WalletEntity wallet, Coin src) {
        publish(wallet, true, src);
    }

}
