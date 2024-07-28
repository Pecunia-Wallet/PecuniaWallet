package com.pecuniawallet.types;

public enum TransactionError {
    BAD_COIN(-100),
    EMPTY_OUTPUTS(-125),
    MALFORMED_ADDRESS(-175),
    DUSTY_REQUEST(-300),
    INSUFFICIENT_MONEY(-400);

    public final int code;

    TransactionError(int code) {
        this.code = code;
    }

}
