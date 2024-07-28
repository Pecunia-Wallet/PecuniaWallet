package com.pecuniawallet.rest;

import com.pecuniawallet.config.property.FiatCurrencyProperties;
import com.pecuniawallet.crypto.base.Coin;
import com.pecuniawallet.crypto.base.DisplayableCoin;
import com.pecuniawallet.crypto.base.SingleCoinNetwork;
import com.pecuniawallet.model.FiatCurrency;
import com.pecuniawallet.util.ColorUtils;
import jakarta.annotation.Nullable;
import jakarta.servlet.http.HttpServletResponse;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/res")
public class ResourceController {

    @Autowired FiatCurrencyProperties fiatCurrencies;
    @Autowired List<Coin> coins;

    @RequestMapping("/fiat")
    public List<FiatCurrency> getFiatCurrencies() {
        return fiatCurrencies.get();
//        return fiatCurrencies.getFiatCurrencies();
    }

    public record CoinContainer(
            String shortName,
            String fullName,
            int decimals,
            @Nullable URI imageUri,
            String color
    ) {}

    @RequestMapping("/coins")
    public List<CoinContainer> getCoins() {
        System.out.println(coins.getFirst() instanceof DisplayableCoin);
        return coins.stream()
                .map(coin -> {
                    val dCoin = coin instanceof DisplayableCoin ? (DisplayableCoin) coin : null;
                    val image = dCoin != null ? dCoin.getImage() : coin.network().getImage();
                    val color = dCoin != null ? ColorUtils.toWebHex(dCoin.getColor()) : null;
                    return new CoinContainer(
                            coin.getAbbreviation(),
                            coin.getName(),
                            coin.getDecimals(),
                            image,
                            color);
                })
                .toList();
    }

}
