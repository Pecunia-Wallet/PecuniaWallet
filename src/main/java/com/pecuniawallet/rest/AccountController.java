package com.pecuniawallet.rest;

import com.pecuniawallet.config.property.FiatCurrencyProperties;
import com.pecuniawallet.model.FiatCurrency;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.repo.TokenRepository;
import com.pecuniawallet.repo.WalletRepository;
import com.pecuniawallet.util.AuthenticationUtils;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/account")
public class AccountController {

    @Autowired FiatCurrencyProperties fiatCurrencyProperties;
    @Autowired TokenRepository tokenRepo;
    @Autowired WalletRepository walletRepo;

    @PostMapping("/currency")
    public void setAccountCurrency(@RequestBody String shortName, HttpServletResponse response) {
        Optional<String> currency = fiatCurrencyProperties.get().stream()
                .map(FiatCurrency::getShortName)
                .filter(name -> name.equalsIgnoreCase(shortName))
                .findAny();

        if (currency.isPresent()) {
            WalletEntity wallet = AuthenticationUtils.getAuthenticationToken().getWallet();
            if (wallet == null) throw new IllegalStateException("Bad authentication.");
            wallet = walletRepo.findById(wallet.getId()).orElseThrow();
            wallet.setAccountCurrency(currency.get());
            walletRepo.save(wallet);
        } else response.setStatus(HttpStatus.BAD_REQUEST.value());
    }

    /**
     * @return short name of the currency, e.g., USD for US Dollar.
     * Same to {@link #setAccountCurrency(String, HttpServletResponse)} shortName arg.
     */
    @GetMapping("/currency")
    public String getAccountCurrency() {
        return Optional.ofNullable(AuthenticationUtils.getAuthenticationToken().getWallet())
                .map(wallet -> walletRepo.findById(wallet.getId()).orElseThrow())
                .map(WalletEntity::getAccountCurrency)
                .orElseGet(() -> fiatCurrencyProperties.get().getFirst().getShortName());
    }

}
