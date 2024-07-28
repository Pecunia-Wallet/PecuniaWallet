package com.pecuniawallet.websocket;

import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;
import com.pecuniawallet.model.Token;
import com.pecuniawallet.model.WalletInitializationStateChangedEvent;
import com.pecuniawallet.repo.TokenRepository;
import com.pecuniawallet.repo.WalletRepository;
import jakarta.transaction.Transactional;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WalletSyncHandler extends TextWebSocketHandler {

    @Autowired Gson gson;
    @Autowired TokenRepository tokenRepo;
    @Autowired WalletRepository walletRepo;

    Map<UUID, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    @EventListener(classes = {WalletInitializationStateChangedEvent.class})
    protected void onWalletInitializationStateChangedListener(
            WalletInitializationStateChangedEvent event) {
        val sessions = this.sessions.get(event.getWallet().getId());
        if (sessions != null) sessions.forEach(session -> {
            val entity = walletRepo.findById(event.getWallet().getId());
            if (entity.isEmpty()) return;
            try {
                session.sendMessage(new TextMessage(Boolean.toString(
                        entity.get().isInitializing())));
            } catch (IOException e) {
                try {session.close(CloseStatus.SERVER_ERROR);} catch (IOException _) {}
            }
        });
    }

    @Override
    @Transactional
    protected void handleTextMessage(
            @NonNull WebSocketSession session, @NonNull TextMessage message) throws IOException {
        log.debug("Got message {}", message);
        if (message.getPayload().equalsIgnoreCase("ping")) return;
        boolean authenticated = sessions.values().stream()
                .anyMatch(sessions -> sessions.contains(session));
        if (authenticated) return;

        HashMap<String, String> body;
        try {
            body = gson.fromJson(message.getPayload(),
                    new TypeToken<HashMap<String, String>>() {}.getType());
        } catch (JsonSyntaxException e) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        if ((body.get("knock") != null || body.get("ping") != null) &&
                body.get("token") == null) return;

        Token token = tokenRepo.findByValueAndType(body.get("token"), Token.Type.ACCESS);
        if (token == null || token.getWallet() == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        walletRepo.updateLastAccess(token.getWallet());
        sessions.computeIfAbsent(token.getWallet().getId(),
                        _ -> Collections.synchronizedSet(new HashSet<>()))
                .add(session);
    }

    @Override
    public void afterConnectionClosed(
            @NonNull WebSocketSession session, @NonNull CloseStatus status) throws Exception {
        super.afterConnectionClosed(session, status);
        sessions.values().forEach(sessions -> sessions.remove(session));
        sessions.keySet().stream()
                .filter(key -> sessions.get(key).isEmpty())
                .forEach(sessions::remove);
    }
}
