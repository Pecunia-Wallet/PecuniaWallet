package com.pecuniawallet.types;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * @param size   items on the page
 * @param offset offset in pages
 */
public record Page<T>(int size, int offset) {

    public List<T> of(Iterable<T> items) {
        return StreamSupport.stream(items.spliterator(), false)
                .skip((long) offset * size)
                .limit(size)
                .collect(Collectors.toList());
    }

}
