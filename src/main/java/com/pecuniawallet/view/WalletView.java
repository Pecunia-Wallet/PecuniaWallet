package com.pecuniawallet.view;

import com.pecuniawallet.types.AppMode;
import com.pecuniawallet.util.AuthenticationUtils;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;

@Slf4j
@RestController
public class WalletView {

    @Value("${app.mode}") AppMode appMode;

    String template;

    public WalletView(
            @Value("classpath:static/build/index.html") Resource template) {
        try {
            this.template = template.getContentAsString(Charset.defaultCharset());
        } catch (IOException e) {
            log.error("Failed to load template", e);
            this.template = "Unavailable now";
        }
    }

    @GetMapping("/app/**")
    public String appPoint(HttpServletResponse response) throws IOException {
        if (appMode == AppMode.STUB) {
            response.sendRedirect("/");
            return null;
        } else return template;
    }

}

