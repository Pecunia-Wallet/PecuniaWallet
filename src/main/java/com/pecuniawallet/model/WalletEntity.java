package com.pecuniawallet.model;

import jakarta.persistence.*;
import lombok.*;
import org.apache.commons.lang3.builder.HashCodeExclude;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;
import java.util.*;

@Entity
@Data
@With
@RequiredArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@Table(name = "wallets")
public class WalletEntity {

    @Id @GeneratedValue UUID id;
    Timestamp lastAccess = new Timestamp(System.currentTimeMillis());

    @CreationTimestamp Timestamp created;

    /**
     * Is wallet created at Pecunia (so we don't need to scan for old transactions),
     * or it is opened by mnemonic Pecunia has never seen
     */
    boolean external;
    boolean initializing;

    @OneToMany @JoinColumn(name = "wallet_id") @HashCodeExclude Set<Token> tokens;

}
