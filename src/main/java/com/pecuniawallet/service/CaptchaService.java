package com.pecuniawallet.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.StreamingHttpOutputMessage;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class CaptchaService {

    @Value("${cloudflare.secret}") String cfSecret;
    @Value("${cloudflare.endpoint}") String cfEndpoint;

    @Autowired RestClient restClient;

    public boolean isTokenValid(String token) {
        Map cfResponse =
                restClient.post()
                        .uri(cfEndpoint)
                        .body(new HashMap<>() {{
                            put("secret", cfSecret);
                            put("response", token);
                        }})
                        .retrieve()
                        .body(Map.class);
        if (cfResponse == null) return false;
        Boolean cfSuccess = (Boolean) cfResponse.get("success");

        if (cfSuccess == null) return false;
        return cfSuccess;
    }
}

