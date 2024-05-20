package com.pecuniawallet.view;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainView {

    @GetMapping("/app")
    public String mainPage() {
        return "main";
    }

}
