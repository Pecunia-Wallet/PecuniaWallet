package com.pecuniawallet.service;

import com.pecuniawallet.model.Email;
import com.pecuniawallet.model.Ticket;
import com.pecuniawallet.repo.TicketRepository;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;

@Service
public class TicketService {

    @Autowired TicketRepository ticketRepo;
    @Autowired EmailService emailService;

    @Value("${app.domain}") String domain;
    @Value("${app.ssl}") boolean ssl;

    private Ticket save(Ticket ticket, boolean sendEmails) {
        if (sendEmails) {
            if (ticket.getEmail() != null && !ticket.getEmail().isBlank()) {
                val email = new Email();
                email.setTo(ticket.getEmail());
                email.setSubject("Your Pecunia Wallet ticket");
                val ctx = new HashMap<String, Object>(Collections.singletonMap(
                        "link", STR."http\{ssl ? "s" :""}://\{domain}/about/support?id=\{ticket.getId()}#access"));
                if (ticket.getMessages().size() == 1) {
                    email.setTemplate("ticket-opened-notification");
                    email.setContext(ctx);
                    emailService.sendMailAsync(email);
                } else if (ticket.getMessages().getLast().isAdminSender()) {
                    email.setTemplate("response-received-notification");
                    ctx.put("text", ticket.getMessages().getLast().getText());
                    email.setContext(ctx);
                    emailService.sendMailAsync(email);
                }
            }
        }

        return ticketRepo.save(ticket);
    }

    public Ticket save(Ticket ticket) {
        return save(ticket, false);
    }

    public Ticket saveAndNotify(Ticket ticket) {
        return save(ticket, true);
    }
}
