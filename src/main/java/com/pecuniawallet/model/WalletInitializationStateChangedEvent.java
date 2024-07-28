package com.pecuniawallet.model;

import com.pecuniawallet.crypto.base.Coin;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class WalletInitializationStateChangedEvent extends ApplicationEvent {

    /**
     * Event target
     */
    WalletEntity wallet;

    /**
     * Event publisher, i.e., the coin on that the
     * wallet's initializing state has been changed
     */
    Coin initializer;

    /**
     * Describes if wallet is currently initializing (true) or not
     */
    boolean initializing;

    public WalletInitializationStateChangedEvent(
            WalletEntity wallet, boolean initializing, Coin initializer) {
        super(initializer);
        this.wallet = wallet;
        this.initializer = initializer;
        this.initializing = initializing;
    }

}
