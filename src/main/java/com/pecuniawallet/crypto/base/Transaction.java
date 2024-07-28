package com.pecuniawallet.crypto.base;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.sql.Timestamp;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(of = "id")
public class Transaction {

    /**
     * Transaction id or other unique identifier.
     */
    String id;

    /**
     * Transaction value. Positive if the transaction beholder receives,
     * negative otherwise. Must never be zero.
     */
    BigDecimal amount;

    BigDecimal fee;

    /**
     * The wallet's addresses if the wallet receives and the receivers if sends.
     */
    List<String> addresses;

    /**
     * The time the transaction was committed to blockchain.
     */
    Timestamp time;

    Long confirmations;

}
