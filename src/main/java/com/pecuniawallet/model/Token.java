package com.pecuniawallet.model;

import jakarta.annotation.Nullable;
import jakarta.persistence.*;
import lombok.*;

import java.sql.Timestamp;
import java.util.UUID;

@Entity
@Data
@With
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
@Table(name = "tokens")
public class Token {

    @Id @GeneratedValue UUID id;

    Timestamp expires;

    String value;

    @Enumerated Type type;

    @ManyToOne(fetch = FetchType.EAGER) @Nullable WalletEntity wallet;

    public enum Type {
        ACCESS, LOCK
    }

}
