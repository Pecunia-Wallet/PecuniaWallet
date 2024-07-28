package com.pecuniawallet.view;

import com.pecuniawallet.types.AppMode;
import com.pecuniawallet.util.AuthenticationUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.BufferedInputStream;
import java.io.IOException;

@Controller
public class MainView {

    @Value("${app.mode}") AppMode mode;
    @Value("classpath:static/images/favicon.png") Resource favicon;


    @GetMapping("/")
    public String mainPage() {
        if (mode != AppMode.STUB && AuthenticationUtils.authenticated())
            return "redirect:/app";
        return "main";
    }

    @ResponseBody
    @RequestMapping(value = "/favicon.*", produces = {MediaType.IMAGE_PNG_VALUE})
    public byte[] favicon() throws IOException {
        return new BufferedInputStream(favicon.getInputStream()).readAllBytes();
    }

}
