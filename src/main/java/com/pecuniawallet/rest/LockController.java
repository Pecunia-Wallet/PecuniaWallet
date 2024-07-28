package com.pecuniawallet.rest;

import com.pecuniawallet.model.Token;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.repo.TokenRepository;
import com.pecuniawallet.repo.WalletRepository;
import com.pecuniawallet.service.TokenService;
import com.pecuniawallet.util.HttpUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@RestController
public class LockController {

    @Autowired
    TokenRepository tokenRepo;
    @Autowired
    TokenService tokenService;
    @Autowired
    WalletRepository walletRepo;

    @Value("${lock.cookie.name}") String lockCookieName;
    @Value("${session.attributes.wordlist.name}") String wordListAttributeName;
    @Value("${authorization.token.max}") Integer maxAccessTokens;

    @GetMapping("/lock")
    public String lockApp(
            HttpServletRequest request, HttpServletResponse response, HttpSession session) {
        val lockCookie = Arrays.stream(request.getCookies())
                .filter(cookie -> cookie.getName().equals(lockCookieName))
                .findAny();
        if (lockCookie.isEmpty()) return HttpUtils
                .returnWithStatus(response, HttpStatus.FORBIDDEN);

        Token token = tokenRepo.findByValueAndType(lockCookie.get().getValue(), Token.Type.LOCK);
        if (!HttpUtils.reqNonNull(token)) return HttpUtils
                .returnWithStatus(response, HttpStatus.FORBIDDEN);

        val wordList = (List<String>) session.getAttribute(wordListAttributeName);

        WalletEntity wallet;
        if (token.getWallet() == null && wordList != null && !wordList.isEmpty()) {
            wallet = new WalletEntity();
        } else if (token.getWallet() != null) {
            wallet = token.getWallet();
            if (wallet.getTokens() != null) {
                val accessTokens = new ArrayList<>(wallet.getTokens().stream()
                        .filter(t -> t.getType().equals(Token.Type.ACCESS))
                        .sorted(Comparator.comparing(Token::getExpires).reversed())
                        .toList());
                if (accessTokens.size() == maxAccessTokens) {
                    accessTokens.removeLast();
                    accessTokens.addAll(wallet.getTokens().stream()
                            .filter(t -> t.getType().equals(Token.Type.LOCK)).toList());
                    wallet.setTokens(new HashSet<>(accessTokens));
                }
            }
        } else {
            return HttpUtils.returnWithStatus(response, HttpStatus.UNAUTHORIZED);
        }

        wallet.setLastAccess(Timestamp.valueOf(LocalDateTime.now()));
        if (wallet.getTokens() == null) wallet.setTokens(new HashSet<>());
        Token accessToken = tokenService.generateTokenAndSave(Token.Type.ACCESS);
        wallet.getTokens().add(accessToken);
        walletRepo.save(wallet);

        response.addCookie(new Cookie(lockCookieName, null) {{
            setMaxAge(0);
        }});
        tokenRepo.delete(token);

        return accessToken.getValue();
    }

}
