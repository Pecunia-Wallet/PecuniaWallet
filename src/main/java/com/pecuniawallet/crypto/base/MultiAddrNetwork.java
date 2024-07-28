package com.pecuniawallet.crypto.base;

import com.pecuniawallet.model.WalletEntity;
import lombok.NonNull;

import java.util.Set;

/**
 * Network that has many address extraction ways,
 * so we would probably want to specify one
 */
public interface MultiAddrNetwork extends Network {

    /**
     * @return script types supported by the network
     */
    Set<String> types();

    default String defaultType() {
        return types().stream().findFirst().orElseThrow();
    }

    /**
     * {@link Network#freshReceiveAddress(WalletEntity)} with address type.
     * @param type address type (e.g., script)
     * @throws IllegalArgumentException if the given type is unsupported
     */
    String freshReceiveAddress(@NonNull WalletEntity walletEntity, String type) throws IllegalArgumentException;

    /**
     * {@link Network#currentReceiveAddress(WalletEntity)} with address type.
     * @param type address type (e.g., script)
     * @throws IllegalArgumentException if the given type is unsupported
     */
    String currentReceiveAddress(@NonNull WalletEntity walletEntity, String type) throws IllegalArgumentException;

}
