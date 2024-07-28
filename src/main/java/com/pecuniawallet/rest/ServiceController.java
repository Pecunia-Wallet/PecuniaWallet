package com.pecuniawallet.rest;

import com.pecuniawallet.model.Token;
import com.pecuniawallet.repo.TokenRepository;
import com.pecuniawallet.service.TokenService;
import com.pecuniawallet.util.AuthenticationUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Map;

@RestController
public class ServiceController {

    @Value("${lock.cookie.name}") String lockCookieName;
    @Value("${lock.token.length}") int lockCookieLength;

    @Autowired private TokenRepository tokenRepo;

    @RequestMapping("/check/auth")
    public boolean checkAuth() {
        return AuthenticationUtils.fullyAuthenticated();
    }

    @RequestMapping("/check/lock")
    public boolean checkLock(HttpServletRequest request) {
        return Arrays.stream(request.getCookies())
                .filter(cookie -> cookie.getName().equals(lockCookieName)
                        && cookie.getValue().length() == lockCookieLength)
                .anyMatch(cookie -> tokenRepo
                        .findByValueAndType(cookie.getValue(), Token.Type.LOCK) != null);
    }

}
