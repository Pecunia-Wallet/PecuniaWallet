package com.pecuniawallet.service;

import com.pecuniawallet.model.Email;
import jakarta.mail.internet.MimeMessage;
import lombok.SneakyThrows;
import lombok.val;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.exceptions.TemplateInputException;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.nio.charset.StandardCharsets;

@Service
public class EmailService {

    @Autowired JavaMailSender sender;
    @Autowired SpringTemplateEngine templateEngine;

    @Value("${app.domain}") String domain;

    @SneakyThrows
    public void sendMail(Email email) {
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message,
                MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());
        Context context = new Context();
        context.setVariables(email.getContext());

        boolean html = email.getTemplate() != null;
        String emailContent;
        if (html) {
            val pathToTemplate = STR."mails/\{email.getTemplate()}";
            try {
                emailContent = templateEngine.process(STR."\{pathToTemplate}.min.html", context);
            } catch (TemplateInputException e) {
                emailContent = templateEngine.process(STR."\{pathToTemplate}.html", context);
            }
        } else emailContent = email.getText();

        helper.setTo(email.getTo());
        helper.setSubject(email.getSubject());
        helper.setFrom(STR."Pecunia Wallet <noreply@\{domain}>");
        helper.setText(emailContent, html);

        sender.send(message);
    }

    public @Async void sendMailAsync(Email email) {
        sendMail(email);
    }

    public void reportProblem(Throwable thr, String message) {
        val email = new Email();
        email.setSubject("A problem occurred in the application.");
        email.setTo(STR."dev@\{domain}");
        val st = thr.getStackTrace()[0];
        email.setText(STR."[\{st.getClassName()}:\{st.getLineNumber()}]\n\{message}");
        sendMail(email);
    }

    public @Async void reportProblemAsync(Throwable thr, String message) {
        reportProblem(thr, message);
    }
}
