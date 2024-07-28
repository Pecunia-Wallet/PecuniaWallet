package com.pecuniawallet.crypto.bitcoin;

import com.pecuniawallet.crypto.util.BitcoinUtils;
import jakarta.annotation.Nullable;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import wf.bitcoin.javabitcoindrpcclient.BitcoinJSONRPCClient;
import wf.bitcoin.javabitcoindrpcclient.BitcoinRPCException;
import wf.bitcoin.javabitcoindrpcclient.GenericRpcException;

import java.io.File;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.MalformedURLException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

@Slf4j
@Component
public class BitcoinJsonRpcClient extends BitcoinJSONRPCClient {

    protected static final File MAIN_WORKING_DIR = new File(System.getProperty("user.home"), ".bitcoin");
    protected static final File TEST_WORKING_DIR = new File(System.getProperty("user.home"), ".bitcoin/testnet3/wallets");

    protected final String user;
    protected final String pass;
    protected final int port;
    protected final boolean test;
    protected final File workingDir;

    @Autowired
    public BitcoinJsonRpcClient(
            @Value("${app.testnet:false}") boolean testnet,
            @Value("${bitcoin.rpc.auth.user:root}") String rpcUser,
            @Value("${bitcoin.rpc.auth.password:root}") String rpcPass,
            @Value("${bitcoin.rpc.port.main:8332}") Integer mainRpcPort,
            @Value("${bitcoin.rpc.port.test:18332}") Integer testRpcPort) throws MalformedURLException {
        this(rpcUser, rpcPass, testnet ? testRpcPort : mainRpcPort, testnet, null);
    }

    protected BitcoinJsonRpcClient(String user, String pass,
                                   int port, boolean test,
                                   @Nullable String wallet) throws MalformedURLException {
        super(STR."http://\{user}:\{pass}@localhost:\{port}/\{wallet == null ? "" : STR."wallet/\{wallet}"}");
        this.test = test;
        workingDir = test ? TEST_WORKING_DIR : MAIN_WORKING_DIR;
        this.user = user;
        this.pass = pass;
        this.port = port;
    }

    protected void destroyAllWallets() {
        listLoadedWallets().forEach(wallet -> {
            val walletRpc = atWallet(wallet);
            try { walletRpc.abortRescan(); } catch (Exception _) {}
            walletRpc.unloadWallet();
            deleteWallet(wallet);
        });
    }

    @PostConstruct
    protected @Async void init() {
        try {
            ping();
            destroyAllWallets();
        } catch (BitcoinRPCException e) {
            log.error("Failed to ping Bitcoin RPC. Ensure that Bitcoin Core is running " +
                    "and allows incoming connections", e);
            throw new RuntimeException(e);
        }
    }

    @PreDestroy
    protected void destroy() {
        destroyAllWallets();
    }

    public BitcoinJsonRpcClient atWallet(String name) {
        try {
            return new BitcoinJsonRpcClient(user, pass, port, test, name);
        } catch (MalformedURLException e) {
            throw new RuntimeException(e);
        }
    }

    public InetSocketAddress nodeAddr() {
        return new InetSocketAddress("localhost", port);
    }

    @Override
    public List<Transaction> listTransactions() {
        return listTransactions("*", Integer.MAX_VALUE);
    }

    public Block getBlock(long height) {
        String hash = (String) query("getblockhash", height);
        return super.getBlock(hash);
    }

    public void importAddresses(String... addresses) {
        val args = new ArrayList<>();
        for (val addr : addresses) {
            val descriptor = new HashMap<>();
            descriptor.put("desc", BitcoinUtils.Descriptors.wrapWithChecksum(addr));
            descriptor.put("timestamp",
                    TimeUnit.MILLISECONDS.toSeconds(new Date().getTime()) +
                            TimeUnit.HOURS.toSeconds(2));
            args.add(descriptor);
        }
        query("importdescriptors", args);
    }

    @SuppressWarnings("unchecked")
    public long minFee() {
        Map<String, ?> memPoolInfo = (Map<String, ?>) query("getmempoolinfo");
        return (long) memPoolInfo.get("mempoolminfee");
    }

    @SuppressWarnings("unchecked")
    public long rescanBlockchain(long from) {
        val response = (Map<String, Long>) query("rescanblockchain", from);
        return response.getOrDefault("stop_height", 0L);
    }

    public long rescanBlockchain() {
        return rescanBlockchain(0);
    }

    public void rescanBlockchainAsync(long from, @Nullable Consumer<Long> callback) {
        CompletableFuture.supplyAsync(() -> rescanBlockchain(from))
                .thenAccept(height -> {
                    if (callback != null)
                        callback.accept(height);
                });
    }

    public void rescanBlockchainAsync(@Nullable Consumer<Long> callback) {
        rescanBlockchainAsync(0, callback);
    }

    public void rescanBlockchainAsync() {
        rescanBlockchainAsync(0, null);
    }

    public void abortRescan() {
        query("abortrescan");
    }

    public void createWallet(String name) {
        if (walletExists(name)) {
            try {
                loadWallet(name);
                return;
            } catch (Exception _) {}
        }
        query("createwallet", name, true, true, "", false, true, false, false);
    }

    private File getWalletFile(String name) {
        name = name.toLowerCase();
        return new File(workingDir, name);
    }

    public boolean walletExists(String name) {
        File wallet = getWalletFile(name);
        return wallet.exists();
    }

    public void deleteWallet(String name) {
        try {unloadWallet(name);} catch (Exception _) {}
        if (walletExists(name)) {
            try {
                FileUtils.deleteDirectory(getWalletFile(name));
            } catch (IOException e) {
                log.warn("Failed to delete wallet {}", name);
            }
        }
    }

    @SuppressWarnings("unchecked")
    public List<String> listLoadedWallets() {
        return (List<String>) query("listwallets");
    }

    public void loadWallet(String name) {
        if (!listLoadedWallets().contains(name))
            query("loadwallet", name);
    }

    public void unloadWallet(String name) {
        if (listLoadedWallets().contains(name))
            query("unloadwallet", name);
    }

    public void unloadWallet() {
        query("unloadwallet");
    }

}
