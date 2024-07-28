package com.pecuniawallet.config.security;

import com.pecuniawallet.types.AppMode;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.channel.ChannelProcessingFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.*;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.util.AntPathMatcher;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.ssl}") Boolean requiresSecure;
    @Value("${app.mode}") AppMode mode;
    @Value("${app.promo}") Boolean promo;

    @Autowired ThrottlingFilter throttlingFilter;
    @Autowired AuthenticationFilter authenticationFilter;

    /**
     * Asset paths are ignored by throttling and authentication filters
     */
    final static String[] ASSET_PATHS = new String[]{
            "/scripts/**",
            "/styles/**",
            "/images/**",
            "/assets/**",
            "/build/**",
            "/favicon.*"
    };

    /**
     * These paths are ignored by authentication filters
     */
    final static String[] SKIP_AUTH_PATHS = new String[]{
            "/res/**",
            "/ws/**",
            "/error"
    };

    /**
     * Anonymous paths are accessible only for users w/o authentication at all
     */
    final static String[] ANONYMOUS_PATHS = new String[]{
            "/new",
            "/seed/**",
            "/open"
    };

    private RequestMatcher[] anyMethod(String... paths) {
        return Arrays.stream(paths)
                .map(AntPathRequestMatcher::new)
                .toList().toArray(new RequestMatcher[]{});
    }

    @Bean
    public SecurityFilterChain config(HttpSecurity http) throws Exception {
        if (requiresSecure) http.requiresChannel(channel -> channel.anyRequest().requiresSecure());

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(anyMethod(ASSET_PATHS)).permitAll()
                .requestMatchers(anyMethod(SKIP_AUTH_PATHS)).permitAll()
                .requestMatchers(anyMethod(ANONYMOUS_PATHS)).permitAll()
                .requestMatchers(
                        "/",
                        "/app/**",
                        "/about/**",
                        "/support/**",
                        "/csrf",
                        "/lock",
                        "/check/**"
                ).permitAll()
                .requestMatchers("/binance/**").authenticated()
                .anyRequest().hasAnyAuthority("USER"));

        http.csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()));

        http.cors(cors -> cors.configure(http));

        http.addFilterBefore(throttlingFilter, ChannelProcessingFilter.class);
        http.addFilterBefore(authenticationFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(applicationModeFilter(), AuthenticationFilter.class);
        http.addFilterBefore(promoActionFilter(), AuthenticationFilter.class);

        http.sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.ALWAYS));

        http.formLogin(login -> login.loginPage("/"));

        http.logout(logout -> logout
                .logoutRequestMatcher(new AntPathRequestMatcher("/logout")).permitAll()
                .addLogoutHandler((request, response, _) -> {
                    for (Cookie cookie : request.getCookies()) {
                        cookie.setMaxAge(0);
                        cookie.setPath("/");
                        response.addCookie(cookie);
                    }
                })
                .clearAuthentication(true)
                .invalidateHttpSession(true)
                .logoutSuccessUrl("/"));

        return http.build();
    }

    Filter applicationModeFilter() {
        return (servletRequest, servletResponse, filterChain) -> {
            val request = (HttpServletRequest) servletRequest;
            if (Arrays.stream(ASSET_PATHS).anyMatch(path ->
                    new AntPathMatcher().match(path, request.getRequestURI()))) {
                filterChain.doFilter(servletRequest, servletResponse);
                return;
            }
            if (mode == AppMode.STUB) {
                if (new AntPathMatcher().match("/", request.getRequestURI())) {
                    filterChain.doFilter(servletRequest, servletResponse);
                } else {
                    val response = (HttpServletResponse) servletResponse;
                    response.sendRedirect("/");
                }
            } else filterChain.doFilter(servletRequest, servletResponse);
        };
    }

    Filter promoActionFilter() {
        return (servletRequest, servletResponse, filterChain) -> {
            if (promo) {
                filterChain.doFilter(servletRequest, servletResponse);
                return;
            }
            val request = (HttpServletRequest) servletRequest;
            val response = (HttpServletResponse) servletResponse;
            val matcher = new AntPathMatcher();
            String[] restrictedPaths = {
                    "/about/promo",
                    "/scripts/marquee.js",
                    "/styles/promo-alert.css"
            };
            for (String path : restrictedPaths) {
                if (matcher.match(path, request.getRequestURI())) {
                    response.sendRedirect("/");
                    return;
                }
            }

            filterChain.doFilter(servletRequest, servletResponse);
        };
    }
}
