package com.pecuniawallet.repo;

import com.pecuniawallet.model.WalletEntity;
import jakarta.transaction.Transactional;
import lombok.val;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<WalletEntity, UUID> {

    default WalletEntity findByMnemonic(String mnemonic) {
        val buff = ByteBuffer.allocate(Long.BYTES);
        buff.put(mnemonic.getBytes());
        buff.flip();
        return findById(new UUID(mnemonic.hashCode(), buff.getLong()))
                .orElse(null);
    }

    @Modifying
    @Transactional
    @Query("""
            UPDATE WalletEntity e
            SET e.lastAccess = CURRENT_TIMESTAMP
            WHERE e = :entity""")
    void updateLastAccess(WalletEntity entity);

    @Modifying
    @Transactional
    @Query("""
            UPDATE WalletEntity e
            SET e.initializing = :initializing
            WHERE e.id = :id""")
    void updateInitializingById(UUID id, boolean initializing);

}
