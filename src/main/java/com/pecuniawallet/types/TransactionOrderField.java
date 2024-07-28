package com.pecuniawallet.types;

import com.pecuniawallet.crypto.base.Transaction;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Comparator;

/**
 * Ways to sort collections of type {@link Transaction}
 */
public enum TransactionOrderField {
    /**
     * Sort by {@link Transaction#getAmount()}
     */
    AMOUNT {
        @Override public Comparator<Transaction> comparator() {
            return Comparator.comparing(Transaction::getAmount);
        }
    },
    /**
     * Sort by {@link Transaction#getTime()}
     */
    TIME {
        @Override public Comparator<Transaction> comparator() {
            return Comparator.comparing(Transaction::getTime);
        }
    },
    /**
     * Sort by type: sending or receiving, i.e., if {@link Transaction#getAmount()}
     * returns a positive value this is receiving, and sending otherwise.
     * Note that receive transactions come first with {@link OrderDirection#ASC}
     */
    TYPE {
        @Override public Comparator<Transaction> comparator() {
            return Comparator.comparing(Transaction::getAmount, (a1, a2) -> {
                if (a1.compareTo(a2) == 0) return 0;
                boolean a1Positive = a1.compareTo(BigDecimal.ZERO) > 0;
                boolean a2Positive = a2.compareTo(BigDecimal.ZERO) > 0;
                if (a1Positive == a2Positive) return 0;
                if (a1Positive) return 1;
                return -1;
            });
        }
    };

    public abstract Comparator<Transaction> comparator();

}
