package com.pecuniawallet.view;

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
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Controller
public class LockView {

    @Autowired TokenRepository tokenRepo;
    @Autowired TokenService tokenService;
    @Autowired WalletRepository walletRepo;

    @Value("${lock.cookie.name}") String lockCookieName;
    @Value("${session.attributes.wordlist.name}") String wordListAttributeName;
    @Value("${authorization.token.max}") Integer maxAuthTokens;

    @GetMapping("/lock")
    public String lockApp(
            HttpServletRequest request, HttpServletResponse response, HttpSession session, Model model) {
        Cookie lockCookie = null;
        for (Cookie cookie : request.getCookies()) {
            if (cookie.getName().equals(lockCookieName)) {
                lockCookie = cookie;
                break;
            }
        }
        if (!HttpUtils.reqNonNull(lockCookie)) return "redirect:/new";

        @SuppressWarnings("ConstantConditions") // lockCookie is non null since HttpUtils#reqNonNull called
        Token token = tokenRepo.findByValueAndType(lockCookie.getValue(), Token.Type.LOCK);
        if (!HttpUtils.reqNonNull(token)) return "redirect:/open";

        val wordList = (List<String>) session.getAttribute(wordListAttributeName);
        boolean newWallet = token.getWallet() == null && wordList != null && wordList.size() == 12;
        boolean existingWallet = token.getWallet() != null;

        WalletEntity wallet;
        if (newWallet) {
            wallet = new WalletEntity();
        } else if (existingWallet) {
            wallet = token.getWallet();
            if (wallet.getTokens() != null) {
                val accessTokens = new ArrayList<>(wallet.getTokens().stream()
                        .filter(t -> t.getType().equals(Token.Type.ACCESS))
                        .sorted(Comparator.comparing(Token::getExpires).reversed())
                        .toList());
                if (accessTokens.size() == maxAuthTokens) {
                    accessTokens.removeLast();
                    accessTokens.addAll(wallet.getTokens().stream()
                            .filter(t -> t.getType().equals(Token.Type.LOCK)).toList());
                    wallet.setTokens(new HashSet<>(accessTokens));
                }
            }
        } else {
            return "redirect:/app";
        }

        wallet.setLastAccess(Timestamp.valueOf(LocalDateTime.now()));
        if (wallet.getTokens() == null) wallet.setTokens(new HashSet<>());
        Token accessToken = tokenService.generateTokenAndSave(Token.Type.ACCESS);
        wallet.getTokens().add(accessToken);
        walletRepo.save(wallet);


        response.addCookie(new Cookie(lockCookieName, "used") {{
            setMaxAge((int) TimeUnit.MINUTES.toSeconds(30));
        }});
        tokenRepo.delete(token);

        model.addAttribute("token", token.getValue());
        return "lock";
    }

}
