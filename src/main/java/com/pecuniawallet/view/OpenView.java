package com.pecuniawallet.view;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class OpenView {

    @GetMapping("/open")
    public String openExistingPage() {
        return "open";
    }

}
