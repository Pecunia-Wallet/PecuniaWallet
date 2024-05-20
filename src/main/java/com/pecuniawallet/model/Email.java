package com.pecuniawallet.model;

import jakarta.annotation.Nullable;
import lombok.Data;
import lombok.NonNull;
import org.apache.commons.lang3.builder.EqualsExclude;
import org.apache.commons.lang3.builder.HashCodeExclude;

import java.util.Map;

@Data
public class Email {

    String to;
    String subject;
    @Nullable String template;
    @NonNull String text = "";

    @HashCodeExclude @EqualsExclude
    Map<String, Object> context;

}
