package com.pecuniawallet.types;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Map;

@Data
public class TransactionRequest {

    @NotEmpty Map<String, BigDecimal> outputs;

    BigDecimal fee;

    boolean recipientsPayFees;

}
