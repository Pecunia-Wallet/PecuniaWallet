package com.pecuniawallet.crypto.base;

import java.awt.*;
import java.net.URI;

/**
 * Describes a coin, that is designed to be displayed for user, i.e.,
 * has information about how it looks
 */
public interface DisplayableCoin extends Coin {

    /**
     * @return uri to an image associated with the coin
     */
    URI getImage();

    /**
     * @return a color associated with the coin
     */
    Color getColor();

}
