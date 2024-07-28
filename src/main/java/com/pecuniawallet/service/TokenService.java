package com.pecuniawallet.service;

import com.pecuniawallet.model.Token;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import com.pecuniawallet.repo.TokenRepository;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class  TokenService {

    @Autowired TokenRepository tokenRepo;

    @Value("${authorization.token.length}") Integer authTokenLength;
    @Value("${authorization.token.lifetime}") Duration authTokenLifetime;
    @Value("${authorization.cookie.name}") String authCookieName;

    @Value("${lock.token.length}") Integer lockTokenLength;
    @Value("${lock.token.lifetime}") Duration lockTokenLifetime;
    @Value("${lock.cookie.name}") String lockCookieName;

    public Token generateToken(@NonNull Token.Type tokenType,
                               @NonNull Integer tokenLength,
                               @NonNull Duration lifetime) {
        return new Token()
                .withType(tokenType)
                .withExpires(Timestamp.valueOf(
                        LocalDateTime.now().plusSeconds(lifetime.getSeconds())))
                .withValue(RandomStringUtils.randomAlphanumeric(tokenLength));
    }

    public Token generateToken(@NonNull Token.Type tokenType) {
        return generateToken(tokenType, authTokenLength, authTokenLifetime);
    }

    public Token generateToken(@NonNull Token.Type tokenType, @NonNull Integer tokenLength) {
        return generateToken(tokenType, tokenLength, authTokenLifetime);
    }

    public Token generateToken(@NonNull Token.Type tokenType, @NonNull Duration lifetime) {
        return generateToken(tokenType, authTokenLength, lifetime);
    }

    @Transactional
    public Token generateTokenAndSave(@NonNull Token.Type tokenType,
                                      @NonNull Integer tokenLength,
                                      @NonNull Duration lifetime) {
        val token = generateToken(tokenType, tokenLength, lifetime);
        tokenRepo.save(token);
        return token;
    }

    public void saveToCookie(HttpServletResponse response, Token token, String name) {
        if (name == null) name = switch (token.getType()) {
            case LOCK -> lockCookieName;
            case ACCESS -> authCookieName;
        };
        val cookie = new Cookie(name, token.getValue());
        cookie.setMaxAge((int) TimeUnit.MILLISECONDS
                .toSeconds(token.getExpires().getTime() -
                        LocalDateTime.now().toInstant(ZoneOffset.UTC).toEpochMilli()));
        cookie.setSecure(true);
        cookie.setHttpOnly(true);
        cookie.setAttribute("SameSite", "Lax");
        cookie.setPath("/");
        response.addCookie(cookie);
    }

    public void saveToCookie(HttpServletResponse response, Token token) {
        saveToCookie(response, token, null);
    }

    @Transactional
    public Token generateTokenAndSave(@NonNull Token.Type tokenType, @NonNull Duration lifetime) {
        return switch (tokenType) {
            case ACCESS -> generateTokenAndSave(tokenType, authTokenLength, lifetime);
            case LOCK -> generateTokenAndSave(tokenType, lockTokenLength, lifetime);
        };
    }

    @Transactional
    public Token generateTokenAndSave(@NonNull Token.Type tokenType, @NonNull Integer tokenLength) {
        return switch (tokenType) {
            case ACCESS -> generateTokenAndSave(tokenType, tokenLength, authTokenLifetime);
            case LOCK -> generateTokenAndSave(tokenType, tokenLength, lockTokenLifetime);
        };
    }

    @Transactional
    public Token generateTokenAndSave(@NonNull Token.Type tokenType) {
        return switch (tokenType) {
            case ACCESS -> generateTokenAndSave(tokenType, authTokenLength, authTokenLifetime);
            case LOCK -> generateTokenAndSave(tokenType, lockTokenLength, lockTokenLifetime);
        };
    }

    @Transactional
    @Scheduled(fixedRate = 1, timeUnit = TimeUnit.HOURS)
    public void deleteExpired() {
        tokenRepo.deleteExpiredTokens();
    }

}
