package com.pecuniawallet.model;

import com.pecuniawallet.crypto.base.Coin;
import jakarta.persistence.*;
import lombok.*;
import org.apache.commons.lang3.builder.HashCodeExclude;
import org.apache.commons.lang3.builder.ToStringExclude;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Fetch;

import java.sql.Timestamp;
import java.util.*;

@Entity
@Data
@With
@RequiredArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@ToString(exclude = "tokens")
@Table(name = "wallets")
public class WalletEntity {

    @Id @GeneratedValue UUID id;
    Timestamp lastAccess = new Timestamp(System.currentTimeMillis());

    @CreationTimestamp Timestamp created;

    String accountCurrency;

    /**
     * Is wallet created at Pecunia (so we don't need to scan for old transactions),
     * or it is opened by mnemonic Pecunia has never seen
     */
    boolean external;

    /**
     * Is wallet currently initializing by a {@link Coin}.
     * Should be reset to false on app reload
     */
    boolean initializing;

    @OneToMany @JoinColumn(name = "wallet_id") Set<Token> tokens;

}
