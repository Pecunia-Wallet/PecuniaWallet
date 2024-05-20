package com.pecuniawallet.repo;

import com.pecuniawallet.model.Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface TokenRepository extends JpaRepository<Token, UUID> {

    @Modifying
    @Query("DELETE FROM Token t WHERE t.expires <= CURRENT_TIMESTAMP")
    void deleteExpiredTokens();

    Token findByValueAndType(String value, Token.Type type);

}
