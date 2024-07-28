package com.pecuniawallet.util;

import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.experimental.UtilityClass;
import lombok.val;
import org.springframework.http.HttpStatus;

import java.util.Optional;

@UtilityClass
public class HttpUtils {

    public boolean reqNonNull(HttpServletResponse response, HttpStatus errorCode, Object... objs) {
        for (Object obj : objs) {
            if (obj == null) {
                if (response != null) {
                    if (errorCode == null) errorCode = HttpStatus.BAD_REQUEST;
                    response.setStatus(errorCode.value());
                }
                return false;
            }
        }
        return true;
    }

    public <T> T reqOfType(
            HttpServletResponse response, HttpStatus errorCode, Class<T> clazz, Object obj) {
        try {
            return clazz.cast(obj);
        } catch (ClassCastException e) {
            if (response != null) {
                if (errorCode == null) errorCode = HttpStatus.BAD_REQUEST;
                response.setStatus(errorCode.value());
            }
            return null;
        }
    }

    public <T> Optional<T> reqNonNullOfType(
            HttpServletResponse response, HttpStatus errorCode, Class<T> clazz, Object obj) {
        val ofType = reqOfType(response, errorCode, clazz, obj);
        if (obj == null || ofType == null) {
            if (response != null) {
                if (errorCode == null) errorCode = HttpStatus.BAD_REQUEST;
                response.setStatus(errorCode.value());
            }
            return Optional.empty();
        }
        return Optional.of(ofType);
    }

    public <T> T returnWithStatus(
            HttpServletResponse response, @NonNull HttpStatus status, T body) {
        if (response != null) response.setStatus(status.value());
        return body;
    }

    public <T> T returnWithStatus(HttpServletResponse response, @NonNull HttpStatus status) {
        return returnWithStatus(response, status, null);
    }

    public boolean reqNonNull(HttpServletResponse response, Object... objs) {
        return reqNonNull(response, null, objs);
    }

    public boolean reqNonNull(Object... objs) {
        return reqNonNull(null, null, objs);
    }

    public <T> T reqOfType(HttpServletResponse response, Class<T> clazz, Object obj) {
        return reqOfType(response, null, clazz, obj);
    }

    public <T> T reqOfType(Class<T> clazz, Object obj) {
        return reqOfType(null, null, clazz, obj);
    }

    public <T> Optional<T> reqNonNullOfType(HttpServletResponse response, Class<T> clazz, Object obj) {
        return reqNonNullOfType(response, null, clazz, obj);
    }

    public <T> Optional<T> reqNonNullOfType(Class<T> clazz, Object obj) {
        return reqNonNullOfType(null, null, clazz, obj);
    }
}
