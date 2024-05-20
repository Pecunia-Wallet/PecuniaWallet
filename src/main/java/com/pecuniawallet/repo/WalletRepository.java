package com.pecuniawallet.repo;

import com.pecuniawallet.model.WalletEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WalletRepository extends JpaRepository<WalletEntity, UUID> {

    WalletEntity findByMnemonic(String mnemonic);

}
