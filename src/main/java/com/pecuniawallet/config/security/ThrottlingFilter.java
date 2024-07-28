package com.pecuniawallet.config.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Component
public class ThrottlingFilter implements Filter {

    @Value("${bucket.overdraft}") Long overdraft;
    @Value("${bucket.refill.amount}") Long refillAmount;
    @Value("${bucket.refill.period}") Duration refillPeriod;

    private final Map<String, Bucket> buckets = new HashMap<>();

    @Bean
    public FilterRegistrationBean<?> throttlingFilterRegistration(ThrottlingFilter filter) {
        return new FilterRegistrationBean<>(filter) {{
            setEnabled(false);
        }};
    }

    private Bucket createNewBucket() {
        Refill refill = Refill.greedy(refillAmount, refillPeriod);
        Bandwidth limit = Bandwidth.classic(overdraft, refill);
        return Bucket.builder().addLimit(limit).build();
    }

    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain filterChain) throws ServletException, IOException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        System.out.println("Throttling");

        val matcher = new AntPathMatcher();
        for (String s : SecurityConfig.ASSET_PATHS) {
            if (matcher.match(s, request.getRequestURI())) {
                filterChain.doFilter(servletRequest, servletResponse);
                return;
            }
        }

        String ip = request.getRemoteAddr();
        Bucket bucket = buckets.get(ip);
        if (bucket == null) {
            bucket = createNewBucket();
            buckets.put(ip, bucket);
        }

        if (bucket.tryConsume(1)) {
            if (matcher.match("/new", request.getRequestURI()))
                bucket.tryConsume((int) Math.ceil(bucket.getAvailableTokens() / 2.0));
            else if (matcher.match("/seed/verify", request.getRequestURI()))
                bucket.tryConsume(bucket.getAvailableTokens());
            else if (matcher.match("/wallet/**", request.getRequestURI()))
                bucket.tryConsume(5);
            filterChain.doFilter(servletRequest, servletResponse);
        } else {
            HttpServletResponse response = (HttpServletResponse) servletResponse;
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        }
    }

}
