package com.pecuniawallet.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class CaptchaService {

    @Value("${cloudflare.secret}") String cfSecret;

    @Value("${cloudflare.endpoint}") String cfEndpoint;

    public boolean isTokenValid(String token) {
        HashMap<String, String> body =
                new HashMap<>() {{
                    put("secret", cfSecret);
                    put("response", token);
                }};
        Map cfResponse =
                new RestTemplate()
                        .exchange(cfEndpoint, HttpMethod.POST, new HttpEntity<>(body), Map.class)
                        .getBody();
        if (cfResponse == null) return false;
        Boolean cfSuccess = (Boolean) cfResponse.get("success");

        if (cfSuccess == null) return false;
        return cfSuccess;
    }
}

