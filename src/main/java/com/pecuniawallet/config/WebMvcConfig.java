package com.pecuniawallet.config;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        Arrays.stream(new String[]{
                "promo", "security", "conditions", "privacy", "legal", "support", "features"
        }).forEach(path -> registry
                .addViewController(STR."/about/\{path}/**").setViewName("about"));

        registry.addRedirectViewController("/", "/app").setKeepQueryParams(true);


        registry.addViewController("/test").setViewName("lock");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry
                .addMapping("/**")
                .allowedOriginPatterns("http://localhost", "http://192.168.0.2")
                .allowedMethods("*")
                .allowCredentials(true);
    }
}
