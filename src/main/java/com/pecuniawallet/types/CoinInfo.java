package com.pecuniawallet.types;

import java.util.Optional;
import java.util.Set;

public record CoinInfo(String network, String fullName,
                       Set<String> addressTypes, Optional<String> defaultAddressType) {}
