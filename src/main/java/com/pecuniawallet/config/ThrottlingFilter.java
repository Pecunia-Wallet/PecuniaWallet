package com.pecuniawallet.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class ThrottlingFilter {

    @Value("${bucket.overdraft}") Long overdraft;
    @Value("${bucket.refill.amount}") Long refillAmount;
    @Value("${bucket.refill.period}") Duration refillPeriod;

    private final Map<String, Bucket> anonymousBuckets = new HashMap<>();

    private Bucket createNewBucket() {
        Refill refill = Refill.greedy(refillAmount, refillPeriod);
        Bandwidth limit = Bandwidth.classic(overdraft, refill);
        return Bucket.builder().addLimit(limit).build();
    }

    @Bean
    public Filter filter() {
        return (servletRequest, servletResponse, filterChain) -> {
            HttpServletRequest httpRequest = (HttpServletRequest) servletRequest;

            val matcher = new AntPathMatcher();
            val ignored = new String[]{"/images/**", "/scripts/**", "/styles/**"};
            for (String s : ignored) {
                if (matcher.match(s, httpRequest.getRequestURI())) {
                    filterChain.doFilter(servletRequest, servletResponse);
                    return;
                }
            }

            String ip = httpRequest.getRemoteAddr();
            Bucket bucket = anonymousBuckets.get(ip);
            if (bucket == null) {
                bucket = createNewBucket();
                anonymousBuckets.put(ip, bucket);
            }

            if (bucket.tryConsume(1)) {
                if (httpRequest.getRequestURI().equals("/new"))
                    bucket.tryConsume((int) Math.ceil(bucket.getAvailableTokens() / 2.0));
                else if (httpRequest.getRequestURI().equals("/seed/verify"))
                    bucket.tryConsume(bucket.getAvailableTokens());
                filterChain.doFilter(servletRequest, servletResponse);
            } else {
                HttpServletResponse httpResponse = (HttpServletResponse) servletResponse;
                httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            }
        };
    }

}
