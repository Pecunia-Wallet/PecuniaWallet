package com.pecuniawallet;

import com.pecuniawallet.crypto.util.BitcoinUtils;
import jakarta.annotation.PostConstruct;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.lang3.RandomStringUtils;
import org.bitcoinj.base.AddressParser;
import org.bitcoinj.base.Coin;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.crypto.DumpedPrivateKey;
import org.bitcoinj.params.TestNet3Params;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.ApplicationPidFileWriter;

import java.awt.*;
import java.io.File;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;

@Slf4j
@SpringBootApplication
public class PecuniaApplication {

    public static final String DEFAULT_PID_FILENAME = "pecunia.pid";

    public static ApplicationPidFileWriter getPidFileWriter(String[] args, boolean verbose) {
        String pidArg = null;
        for (int i = 0; i < args.length; i++) {
            if (args[i].equals("-pid") || args[i].equals("--pid")) {
                if (i + 1 < args.length) pidArg = args[i + 1];
                break;
            }
        }
        if (pidArg == null) pidArg = Arrays.stream(args)
                .filter(arg -> arg.startsWith("--pid=") || arg.startsWith("-pid="))
                .map(arg -> arg.split("=", 2)[1])
                .findAny()
                .orElse(null);
        if (pidArg != null) {
            if (verbose) log.info("PID file defined as {}", pidArg);
            return new ApplicationPidFileWriter(new File(pidArg));
        } else {

            if (verbose)
                log.info("PID not specified so writing to file \"{}\"", DEFAULT_PID_FILENAME);
            return new ApplicationPidFileWriter(DEFAULT_PID_FILENAME);
        }
    }

    @SneakyThrows
    public static void main(String[] args) {
        val boot = new SpringApplication(PecuniaApplication.class);
        boot.addListeners(getPidFileWriter(args, true));
        boot.run(args);
    }

    @PostConstruct
    public void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}
