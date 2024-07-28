package com.pecuniawallet.config.bean;

import com.google.gson.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;

@Configuration
public class GsonConfig {

    @Bean
    JsonSerializer<LocalDateTime> localDateTimeJsonSerializer() {
        return (src, _, _) -> new JsonPrimitive(src.toString());
    }

    @Bean
    JsonDeserializer<LocalDateTime> localDateTimeJsonDeserializer() {
        return (src, _, _) -> LocalDateTime.parse(src.getAsString());
    }

    @Bean
    Gson gson() {
        return new GsonBuilder()
                .registerTypeAdapter(LocalDateTime.class, localDateTimeJsonSerializer())
                .registerTypeAdapter(LocalDateTime.class, localDateTimeJsonDeserializer())
                .create();
    }

}
