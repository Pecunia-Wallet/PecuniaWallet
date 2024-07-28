package com.pecuniawallet.rest;

import com.google.gson.reflect.TypeToken;
import com.pecuniawallet.model.Token;
import com.pecuniawallet.service.TokenService;
import com.pecuniawallet.util.HttpUtils;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.bitcoinj.crypto.MnemonicCode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.List;
import java.util.Map;

/**
 * Controls wallet creation.
 */
@Slf4j
@RestController
@RequestMapping("/seed")
public class CreationController {

    @Autowired BCryptPasswordEncoder bCrypt;
    @Autowired TokenService tokenService;

    @Value("${session.attributes.wordlist.name}") String wordListAttributeName;
    @Value("${lock.cookie.name}") String lockCookieName;

    @GetMapping("/new")
    public List<String> generateSeed(HttpSession session) {
        List<String> wordList = MnemonicCode.INSTANCE.toMnemonic(new SecureRandom().generateSeed(16));
        session.setAttribute(wordListAttributeName, wordList);
        return wordList;
    }

    @PostMapping("/verify")
    @SuppressWarnings("unchecked cast")
    public void verifySeed(
            @RequestBody Map<String, Object> body, HttpServletResponse response, HttpSession session) {
        try {
            val wordListOptional = HttpUtils.reqNonNullOfType(
                    response, HttpStatus.UNAUTHORIZED,
                    new TypeToken<List<String>>() {}.getRawType(),
                    session.getAttribute(wordListAttributeName)
            );
            if (wordListOptional.isEmpty()) return;
            val wordList = (List<String>) wordListOptional.get();

            val wordIndexes = (List<Integer>) body.get("words");
            val hash = (String) body.get("hash");
            if (!HttpUtils.reqNonNull(response, wordIndexes, hash)) return;
            if (wordIndexes.isEmpty()) {
                HttpUtils.returnWithStatus(response, HttpStatus.BAD_REQUEST);
                return;
            }

            StringBuilder words = new StringBuilder();
            for (Integer index : wordIndexes) {
                if (index < 0 || index >= wordList.size()) {
                    HttpUtils.returnWithStatus(response, HttpStatus.BAD_REQUEST);
                    return;
                }
                words.append(wordList.get(index));
            }

            if (!bCrypt.matches(words.toString(), hash)) {
                HttpUtils.returnWithStatus(response, HttpStatus.FORBIDDEN);
                return;
            }

            val token = tokenService.generateTokenAndSave(Token.Type.LOCK);
            tokenService.saveToCookie(response, token);
        } catch (Exception e) {
            log.error("error", e);
        }
    }

}
