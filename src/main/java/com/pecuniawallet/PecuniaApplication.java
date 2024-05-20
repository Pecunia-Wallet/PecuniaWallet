package com.pecuniawallet;

import jakarta.annotation.PostConstruct;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.*;

@Slf4j
@SpringBootApplication
public class PecuniaApplication {

    @SneakyThrows
    public static void main(String[] args) {
        new SpringApplication(PecuniaApplication.class).run(args);
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}
