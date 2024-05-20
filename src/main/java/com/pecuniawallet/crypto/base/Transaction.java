package com.pecuniawallet.crypto.base;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigInteger;
import java.sql.Timestamp;

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
     * Transaction value. Positive if the transaction beholder receives, negative otherwise.
     */
    BigInteger amount;

    /**
     * Transaction participant address that doesn't belong to the transaction's beholder:
     * the sender's if the beholder receives and the receiver if sends.
     */
    String address;

    /**
     * The time the transaction was committed to blockchain.
     */
    Timestamp time;

}
