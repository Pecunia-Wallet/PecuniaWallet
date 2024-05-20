package com.pecuniawallet.crypto.util;

import lombok.experimental.UtilityClass;
import lombok.val;
import org.bitcoinj.base.LegacyAddress;
import org.bitcoinj.base.Network;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.base.SegwitAddress;
import org.bitcoinj.crypto.ECKey;
import org.bitcoinj.script.ScriptBuilder;
import org.bitcoinj.script.ScriptPattern;

import java.math.BigInteger;

@UtilityClass
public class BitcoinUtils {

    /**
     * Extracts an address from the key. Supported scripts are:
     * {@code P2PKH}, {@code P2SH}, {@code P2WPKH}, {@code P2WSH}.
     *
     * @param net network this key is valid for
     * @param key key from which extract address
     * @param scriptType address extracting script
     * @throws IllegalArgumentException if the given script is not supported
     */
    public String addressFromKey(Network net, ECKey key, ScriptType scriptType) throws IllegalArgumentException {
        return (switch (scriptType) {
            case P2PKH ->
                LegacyAddress.fromPubKeyHash(net, key.getPubKeyHash());
            case P2SH -> {
                val redeemScript = ScriptBuilder.createP2WPKHOutputScript(key);
                val script = ScriptBuilder.createP2SHOutputScript(redeemScript);
                val scriptHash = ScriptPattern.extractHashFromP2SH(script);
                yield LegacyAddress.fromScriptHash(net, scriptHash);
            }
            case P2WPKH ->
                key.toAddress(ScriptType.P2WPKH, net);
            case P2WSH -> {
                val redeemScript = ScriptBuilder.createP2WPKHOutputScript(key);
                val script = ScriptBuilder.createP2WSHOutputScript(redeemScript);
                yield SegwitAddress.fromHash(net, script.getPubKeyHash());
            }
            default -> throw new IllegalArgumentException(scriptType.name());
        }).toString();
    }


    /**
     * <pre>
     * Converted to Java from C++ source.
     * Source: <a href="https://github.com/bitcoin/bitcoin/blob/master/src/script/descriptor.cpp">bitcoin/src/script/descriptor.cpp</a>
     */
    @UtilityClass
    public class Descriptors {
        final String INPUT_CHARSET =
                "0123456789()[],'/*abcdefgh@:$%{}" +
                        "IJKLMNOPQRSTUVWXYZ&+-.;<=>?!^_|~" +
                        "ijklmnopqrstuvwxyzABCDEFGH`#\"\\ ";

        final String CHECKSUM_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

        /**
         * Wraps a plain address as {@code addr()} descriptor.
         * This way, {@code Address} becomes {@code addr(Address)}
         *
         * @param addr plain address.
         * @return {@code addr()} descriptor.
         */
        public String wrap(String addr) {
            return STR."addr(\{addr})";
        }

        /**
         * Adds a checksum to the descriptor got from {@link #wrap(String)}
         * i.e., {@code addr(...)} becomes {@code addr(...)#checksum}
         *
         * @param addr plain address.
         * @return {@code addr()} descriptor with a checksum.
         */
        public String wrapWithChecksum(String addr) {
            val desc = wrap(addr);
            return STR."\{desc}#\{checksum(desc)}";
        }

        public String checksum(String span) {
            BigInteger c = BigInteger.ONE;
            int cls = 0;
            int clsCount = 0;

            for (val ch : span.toCharArray()) {
                int pos = INPUT_CHARSET.indexOf(ch);
                if (pos == -1) return "";
                c = polyMod(c, pos & 31);
                cls = cls * 3 + (pos >> 5);
                if (++clsCount == 3) {
                    c = polyMod(c, cls);
                    cls = 0;
                    clsCount = 0;
                }
            }

            if (clsCount > 0) c = polyMod(c, cls);
            for (int j = 0; j < 8; ++j) c = polyMod(c, 0);
            c = c.xor(BigInteger.ONE);

            StringBuilder checksum = new StringBuilder();
            for (int i = 0; i < 8; ++i) {
                int index = c.shiftRight(5 * (7 - i)).intValue() & 31;
                checksum.append(CHECKSUM_CHARSET.charAt(index));
            }

            return checksum.toString();
        }

        BigInteger polyMod(BigInteger c, int val) {
            val c0 = c.shiftRight(35);
            c = c.and(new BigInteger("07ffffffff", 16))
                    .shiftLeft(5)
                    .xor(BigInteger.valueOf(val));

            if (c0.testBit(0)) c = c.xor(new BigInteger("f5dee51989", 16));
            if (c0.testBit(1)) c = c.xor(new BigInteger("a9fdca3312", 16));
            if (c0.testBit(2)) c = c.xor(new BigInteger("1bab10e32d", 16));
            if (c0.testBit(3)) c = c.xor(new BigInteger("3706b1677a", 16));
            if (c0.testBit(4)) c = c.xor(new BigInteger("644d626ffd", 16));

            return c;
        }
    }
}
