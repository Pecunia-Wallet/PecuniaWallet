package com.pecuniawallet.rest;

import com.google.gson.Gson;
import com.pecuniawallet.service.CaptchaService;
import com.pecuniawallet.service.TicketService;
import com.pecuniawallet.util.HttpUtils;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.transaction.Transactional;
import com.pecuniawallet.model.Ticket;
import com.pecuniawallet.repo.TicketRepository;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/support")
public class SupportController {

    @Autowired CaptchaService captchaService;
    @Autowired TicketRepository ticketRepo;
    @Autowired TicketService ticketService;
    @Autowired Gson gson;

    @Value("${app.domain}") String appDomain;

    final static Pattern EMAIL_REGEX = Pattern.compile("(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21\\x23-\\x5b\\x5d-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01-\\x08\\x0b\\x0c\\x0e-\\x1f\\x21-\\x5a\\x53-\\x7f]|\\\\[\\x01-\\x09\\x0b\\x0c\\x0e-\\x7f])+)])");

    @Transactional
    @PostMapping("/open-ticket")
    public @Async CompletableFuture<String> openNewTicket(
            HttpServletResponse response, @RequestBody Map<String, Object> body) {
        val captcha = (String) body.get("captcha");
        val text = (String) body.get("text");

        if (!HttpUtils.reqNonNull(response, captcha, text)) return null;
        if (!captchaService.isTokenValid(captcha)) return HttpUtils
                .returnWithStatus(response, HttpStatus.FORBIDDEN);
        if (text.strip().length() > 1000 || text.strip().length() < 30)
            return CompletableFuture.completedFuture(HttpUtils
                    .returnWithStatus(response, HttpStatus.BAD_REQUEST));

        val ticket = new Ticket();
        ticket.getMessages().add(new Ticket.Message().withText(text));

        val email = (String) body.get("email");
        if (HttpUtils.reqNonNull(email) && EMAIL_REGEX.matcher(email).matches()) {
            // do not accept application emails
            List<String> emailDomainPart = Arrays.stream(Arrays.stream(email
                    .split("@")).toList().getLast()
                    .split("\\.")).toList();
            if (emailDomainPart.size() > 2)
                emailDomainPart = emailDomainPart.subList(emailDomainPart.size() - 2, emailDomainPart.size());
            if (!String.join(".", emailDomainPart).equalsIgnoreCase(appDomain))
                ticket.setEmail(email);
        }

        CompletableFuture.runAsync(() ->
                ticketService.saveAndNotify(ticket));
        return CompletableFuture.completedFuture(ticket.getId());
    }

    @GetMapping("/get")
    public List<Ticket.Message> getTicketMessages(
            HttpServletResponse response, @RequestParam("id") String ticketId) {
        val ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) return HttpUtils
                .returnWithStatus(response, HttpStatus.NOT_FOUND, null);

        return ticket.get().getMessages();
    }

    @Transactional
    @PostMapping("/complete")
    public @Async CompletableFuture<Ticket.Message> completeTicket(
            HttpServletResponse response, @RequestBody Map<String, Object> body) {
        val ticketId = (String) body.get("id");
        val text = (String) body.get("text");
        val captcha = (String) body.get("captcha");

        if (!HttpUtils.reqNonNull(response, ticketId, text, captcha)) return null;
        if (!captchaService.isTokenValid(captcha)) return HttpUtils
                .returnWithStatus(response, HttpStatus.FORBIDDEN);
        if (text.strip().length() > 1000 || text.strip().length() < 30)
            return CompletableFuture.completedFuture(HttpUtils
                    .returnWithStatus(response, HttpStatus.BAD_REQUEST));

        val complementCount = complementCount(response, ticketId);
        if (complementCount == null || complementCount <= 0) HttpUtils
                .returnWithStatus(response, HttpStatus.FORBIDDEN);

        val ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) return CompletableFuture.completedFuture(HttpUtils
                .returnWithStatus(response, HttpStatus.NOT_FOUND));

        val msg = new Ticket.Message().withText(text);
        ticket.get().getMessages().add(msg);
        CompletableFuture.runAsync(() ->
                ticketService.save(ticket.get()));
        return CompletableFuture.completedFuture(msg);
    }

    @GetMapping("/complements")
    public Byte complementCount(
            HttpServletResponse response, @RequestParam("id") String ticketId) {
        if (!HttpUtils.reqNonNull(response, ticketId)) return null;
        val ticket = ticketRepo.findById(ticketId);
        if (ticket.isEmpty()) return HttpUtils
                .returnWithStatus(response, HttpStatus.NOT_FOUND);
        if (ticket.get().isClosed()) return -1;
        int complementsAvailable = 5;
        val messages = ticket.get().getMessages().stream().sorted(Comparator
                .comparing(Ticket.Message::getSent)).toList();
        for (int i = messages.size() - 1; i > 0; i--) {
            if (messages.get(i).isAdminSender())
                return (byte) Math.max(0, complementsAvailable);
            else complementsAvailable--;
        }
        return (byte) Math.max(0, complementsAvailable);
    }
}
