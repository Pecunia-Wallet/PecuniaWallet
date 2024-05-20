package com.pecuniawallet.view;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RegistrationView {

    @GetMapping("/new")
    public String newWalletPage() {
        return "new";
    }

}
