package com.pecuniawallet.model;

import jakarta.persistence.*;
import lombok.*;
import org.apache.commons.lang3.RandomStringUtils;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@With
@Data
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@Table(name = "tickets")
public class Ticket {

    @Id @Column(length = 10) String id;

    @Column(length = 320) String email;

    boolean closed = false;

    @With
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Message {
        LocalDateTime sent = LocalDateTime.now();
        String text;
        boolean adminSender = false;
    }

    @ElementCollection @JdbcTypeCode(SqlTypes.JSON) List<Message> messages = new ArrayList<>();

    public Ticket() {
        id = RandomStringUtils.randomAlphanumeric(10);
    }
}
