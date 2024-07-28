package com.pecuniawallet.config.bean;

import com.pecuniawallet.types.AppMode;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class ThymeleafVarsConfig {

    @Value("${app.mode}") AppMode mode;
    @Value("${app.promo}") Boolean promo;

    public record Config(AppMode mode, boolean promo) {}

    @Bean
    public Config conf() {
        return new Config(mode, promo);
    }

    @Bean
    public Filter currentUri() {
        return (servletRequest, servletResponse, filterChain) -> {
            val request = (HttpServletRequest) servletRequest;
            request.setAttribute("uri", URI.create(request.getRequestURI()));
            filterChain.doFilter(servletRequest, servletResponse);
        };
    }

}
