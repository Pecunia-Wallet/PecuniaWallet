package com.pecuniawallet.model;

import lombok.*;

import java.net.URI;

@Data
@AllArgsConstructor
@NoArgsConstructor
@RequiredArgsConstructor
public class FiatCurrency {

    @NonNull String shortName;
    @NonNull Character symbol;

    int decimals;
    String fullName;
    URI imageUri;

}
