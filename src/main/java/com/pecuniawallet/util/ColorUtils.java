package com.pecuniawallet.util;

import lombok.experimental.UtilityClass;

import java.awt.*;

@UtilityClass
public class ColorUtils {

    public Color fromHex(String hex) {
        return Color.decode(STR."#\{hex}");
    }

    public String toHex(Color color) {
        return Integer.toHexString((color.getRGB() & 0xffffff) | 0x1000000).substring(1);
    }

    public String toWebHex(Color color) {
        return STR."#\{toHex(color)}";
    }

    public String toWebRgb(Color color) {
        return STR."rgb(\{color.getRed()}, \{color.getGreen()}, \{color.getBlue()})";
    }

    public String toWebRgba(Color color) {
        return STR."rgba(\{color.getRed()}, \{color.getGreen()}, \{color.getBlue()}, \{color.getAlpha()})";
    }

}
