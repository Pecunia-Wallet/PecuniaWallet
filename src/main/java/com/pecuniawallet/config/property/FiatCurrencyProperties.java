package com.pecuniawallet.config.property;

import com.pecuniawallet.model.FiatCurrency;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Setter
@Component
@ConfigurationProperties(prefix = "fiat-currencies")
public class FiatCurrencyProperties {

    List<FiatCurrency> list = new ArrayList<>();

    public List<FiatCurrency> get() {
        return list;
    }

}
