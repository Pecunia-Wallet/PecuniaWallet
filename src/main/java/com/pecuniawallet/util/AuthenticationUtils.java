package com.pecuniawallet.util;

import com.pecuniawallet.model.Token;
import com.pecuniawallet.model.WalletEntity;
import lombok.experimental.UtilityClass;
import lombok.val;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;

@UtilityClass
public class AuthenticationUtils {

    public Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public Token getAuthenticationToken() {
        System.out.println(getAuthentication());
        if (anonymous() || isGuest()) return null;
        val credentials = getAuthentication().getCredentials();
        if (!(credentials instanceof Token))
            throw new IllegalStateException(STR."Unknown credentials: \{credentials}.");
        return (Token) credentials;
    }

    public boolean isAdmin() {
        val auth = getAuthentication();
        return auth.getAuthorities().contains(new SimpleGrantedAuthority(Authority.ADMIN.name()));
    }

    public boolean authenticated() {
        val auth = getAuthentication();
        return Arrays.stream(Authority.values())
                .map(Authority::name)
                .anyMatch(authority -> auth.getAuthorities()
                        .contains(new SimpleGrantedAuthority(authority)));
    }

    public boolean fullyAuthenticated() {
        val auth = getAuthentication();
        return Arrays.stream(Authority.values())
                .map(Authority::name)
                .filter(authority -> !authority
                        .equalsIgnoreCase(Authority.GUEST.name()))
                .anyMatch(authority -> auth.getAuthorities()
                        .contains(new SimpleGrantedAuthority(authority)));
    }

    public boolean isGuest() {
        return authenticated() && !fullyAuthenticated();
    }

    public boolean anonymous() {
        return !authenticated();
    }

    public void authenticate(Object credentials, Authority... authorities) {
        val principal = authorities.length > 0 ? authorities[0].name() : "anonymous";
        val auth = new UsernamePasswordAuthenticationToken(principal, credentials,
                Arrays.stream(authorities)
                        .map(Authority::name)
                        .map(SimpleGrantedAuthority::new)
                        .toList());
        SecurityContextHolder.getContext().setAuthentication(auth);
        System.out.println("Auth as: " + getAuthentication());
    }

    public void authenticateAsGuest() {
        authenticate("guest", Authority.GUEST);
    }

    public void authenticateAsUser(Token token) {
        authenticate(token, Authority.USER);
    }

    public void authenticateAsAdmin(Token token) {
        authenticate(token, Authority.ADMIN);
    }

    public enum Authority {
        USER,
        GUEST,
        ADMIN
    }
}
