package com.pecuniawallet.config.security;

import com.pecuniawallet.model.Token;
import com.pecuniawallet.repo.TokenRepository;
import com.pecuniawallet.util.AuthenticationUtils;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.val;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.io.IOException;
import java.util.Arrays;
import java.util.stream.Stream;

@Component
public class AuthenticationFilter implements Filter {

    @Autowired TokenRepository tokenRepo;

    @Value("${authorization.cookie.name}") String authCookieName;
    @Value("${authorization.token.length}") Integer authTokenLength;

    static String[] IGNORE_PATHS = Stream.of(
            SecurityConfig.ASSET_PATHS,
            SecurityConfig.SKIP_AUTH_PATHS
    ).flatMap(Stream::of).toArray(String[]::new);

    @Bean
    public FilterRegistrationBean registration(AuthenticationFilter filter) {
        FilterRegistrationBean registration = new FilterRegistrationBean(filter);
        registration.setEnabled(false);
        return registration;
    }

    public void doFilter(ServletRequest servletRequest,
                         ServletResponse servletResponse,
                         FilterChain filterChain) throws ServletException, IOException {
        val request = (HttpServletRequest) servletRequest;
        val response = (HttpServletResponse) servletResponse;
        val matcher = new AntPathMatcher();

        for (val ignorePath : IGNORE_PATHS) {
            if (matcher.match(ignorePath, request.getRequestURI())) {
                filterChain.doFilter(servletRequest, servletResponse);
                return;
            }
        }

        val tokenHeader = request.getHeader("X-Token");
        if (tokenHeader != null) {
            val token = tokenRepo.findByValueAndType(tokenHeader, Token.Type.ACCESS);
            if (token != null) {
                AuthenticationUtils.authenticateAsUser(token);
                filterChain.doFilter(servletRequest, servletResponse);
                return;
            }
        }

        val cookies = request.getCookies();
        if (cookies != null) {
            val token = Arrays.stream(cookies).filter(
                    c -> c.getName().equals(authCookieName) &&
                            !c.getValue().isBlank() &&
                            c.getValue().length() >= authTokenLength
            ).findFirst();
            if (token.isPresent()) {
                AuthenticationUtils.authenticateAsGuest();
                if (Arrays.stream(SecurityConfig.ANONYMOUS_PATHS).anyMatch(path ->
                        matcher.match(path, request.getRequestURI()))) {
                    try {
                        response.sendRedirect("/app");
                    } catch (IOException e) {
                        throw new RuntimeException();
                    }
                }
            } else {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(servletRequest, servletResponse);
    }

}
