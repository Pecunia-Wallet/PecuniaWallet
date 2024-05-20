package com.pecuniawallet.config;

import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.val;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.util.AntPathMatcher;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.ssl}") Boolean requiresSecure;
    @Value("${authorization.cookie.name}") String authCookieName;
    @Value("${authorization.token.length}") Integer authTokenLength;
    @Value("${app.mode}") AppMode mode;
    @Value("${app.promo}") Boolean promo;

    @Bean
    public WebSecurityCustomizer securityCustomizer() {
        return web ->
                web.ignoring().requestMatchers("/scripts/**", "/styles/**", "/images/**");
    }

    @Bean
    public SecurityFilterChain config(HttpSecurity http) throws Exception {
        if (requiresSecure) http.requiresChannel(channel -> channel.anyRequest().requiresSecure());

        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/app", "/about/**", "/support/**", "/error", "/test").permitAll()
                .requestMatchers("/new", "/seed/**", "/lock", "/open").anonymous()
                .requestMatchers(HttpMethod.POST,
                        "/new", "/seed/**", "/lock", "/open").anonymous()
                .anyRequest().authenticated());

        http.csrf(Customizer.withDefaults());

        http.addFilterBefore(tokenDetectionFilter(), UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(applicationModeFilter(), AuthorizationFilter.class);
        http.addFilterBefore(promoActionFilter(), AuthorizationFilter.class);

        http.sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.ALWAYS));
        http.formLogin(login -> login
                .loginPage("/app"));
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
                .logoutSuccessUrl("/app"));

        return http.build();
    }


    Filter tokenDetectionFilter() {
        return (servletRequest, servletResponse, filterChain) -> {
            val request = (HttpServletRequest) servletRequest;
            val cookies = request.getCookies();
            if (cookies != null) {
                Arrays.stream(cookies).filter(
                        c ->
                                c.getName().equals(authCookieName)
                                        && !c.getValue().isBlank()
                                        && c.getValue().length() >= authTokenLength
                ).findFirst().ifPresent(c ->
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(null, c.getValue())
                        )
                );
            }


            filterChain.doFilter(servletRequest, servletResponse);
        };
    }

    Filter applicationModeFilter() {
        return (servletRequest, servletResponse, filterChain) -> {
            if (mode == AppMode.STUB) {
                val request = (HttpServletRequest) servletRequest;
                if (new AntPathMatcher().match("/app", request.getRequestURI())) {
                    filterChain.doFilter(servletRequest, servletResponse);
                } else {
                    val response = (HttpServletResponse) servletResponse;
                    response.sendRedirect("/app");
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
            String[] restrictedPaths = {"/about/promo"};
            for (String path : restrictedPaths) {
                if (matcher.match(path, request.getRequestURI())) {
                    response.sendRedirect("/app");
                    return;
                }
            }

            filterChain.doFilter(servletRequest, servletResponse);
        };
    }
}
