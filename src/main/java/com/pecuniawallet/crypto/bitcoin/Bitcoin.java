package com.pecuniawallet.crypto.bitcoin;

import com.pecuniawallet.crypto.base.DisplayableCoin;
import com.pecuniawallet.crypto.base.MultiAddrNetwork;
import com.pecuniawallet.crypto.base.SingleCoinNetwork;
import com.pecuniawallet.crypto.util.BitcoinUtils;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.service.EmailService;
import com.pecuniawallet.service.WalletInitializationStateChangedEventPublisher;
import com.pecuniawallet.util.ColorUtils;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.binary.Hex;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.bitcoinj.base.Address;
import org.bitcoinj.base.AddressParser;
import org.bitcoinj.base.Coin;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.base.exceptions.AddressFormatException;
import org.bitcoinj.core.*;
import org.bitcoinj.core.listeners.DownloadProgressTracker;
import org.bitcoinj.crypto.DumpedPrivateKey;
import org.bitcoinj.crypto.ECKey;
import org.bitcoinj.store.BlockStore;
import org.bitcoinj.store.BlockStoreException;
import org.bitcoinj.store.SPVBlockStore;
import org.bitcoinj.wallet.*;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import wf.bitcoin.javabitcoindrpcclient.BitcoindRpcClient;

import java.awt.*;
import java.io.*;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.ByteBuffer;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

@Slf4j
@Component
public class Bitcoin implements SingleCoinNetwork, MultiAddrNetwork, DisplayableCoin {

    // wallet and store filenames shouldn't start with "tmp-" or "extra-"
    // since files with such prefixes are regularly deleted
    protected static final String WALLET_NAME_TEMPLATE = "%s.%s.%s.wallet"; // chain.shortname.id.wallet
    protected static final String STORE_NAME_TEMPLATE = "%s.%s.%s.store"; // chain.shortname.id.store
    protected static final ScriptType DEFAULT_SCRIPT_TYPE = ScriptType.P2WPKH;
    protected static final ScriptType[] SUPPORTED_RECEIVE_SCRIPTS = {
            ScriptType.P2WPKH,
            ScriptType.P2PKH
    };
    protected final static int ADDRESS_SYNC_SEGMENT = 100;

    @Autowired private EmailService emailService;
    /*@Qualifier("bitcoinJsonRpcClient")*/ @Autowired private BitcoinJsonRpcClient rpcClient;
    @Autowired private BitcoinCheckpointService bitcoinCheckpointService;
    @Autowired
    private WalletInitializationStateChangedEventPublisher initializationStateChangedEventPublisher;

    private final boolean testnet;
    private final File walletsDir;
    private final File storesDir;

    private final Executor listenersExecutor = Executors.newSingleThreadExecutor();
    private final Set<Consumer<WalletKit>> kitInitializedListeners = new CopyOnWriteArraySet<>();
    private final Set<UUID> currentlyInitializingWallets = new ConcurrentSkipListSet<>();

    private final Set<Consumer<WalletKit>> kitSynchronizedListeners = new CopyOnWriteArraySet<>();
    private final Set<UUID> currentlySynchronizingWallets = new ConcurrentSkipListSet<>();

    private final Set<WalletKit> cachedKits = new CopyOnWriteArraySet<>();

    public Bitcoin(@Value("${app.testnet}") boolean testnet,
                   @Value("${app.dir}") String appDir) throws IOException {
        this.testnet = testnet;
        walletsDir = new File(appDir, "wallets");
        if (!walletsDir.exists())
            if (!walletsDir.mkdir() && !walletsDir.mkdirs())
                throw new IOException("Failed to create wallets directory");
        storesDir = new File(appDir, "stores");
        if (!storesDir.exists())
            if (!storesDir.mkdir() && !storesDir.mkdirs())
                throw new IOException("Failed to create stores directory");
    }

    @Override
    public String getName() {
        return "Bitcoin";
    }

    @Override
    public String getAbbreviation() {
        return "BTC";
    }

    @Override
    public int getDecimals() {
        return 8;
    }

    @Override
    public URI getImage() {
        try {
            return new URI("/images/btc.svg");
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public Color getColor() {
        return ColorUtils.fromHex("f7931a");
    }

    private NetworkParameters params() {
        return testnet ? TestNetParams.get() : MainNetParams.get();
    }

    @Override
    public Set<com.pecuniawallet.crypto.base.Transaction> getTransactions(@NonNull WalletEntity entity) {
        Wallet wallet;
        try (val kit = kitFromEntity(entity)) {
            wallet = kit.wallet;
        }
        return wallet.getTransactions(false).parallelStream()
                .map(tx -> {
                    val resultTx = new com.pecuniawallet.crypto.base.Transaction();
                    resultTx.setId(tx.getTxId().toString());
                    resultTx.setAmount(tx.getValue(wallet).toBtc());
                    val receiving = resultTx.getAmount().compareTo(BigDecimal.ZERO) > 0;
                    resultTx.setAddresses(tx.getOutputs().stream()
                            .filter(out -> receiving == out.isMine(wallet))
                            .map(out -> out
                                    .getScriptPubKey()
                                    .getToAddress(params().network()).toString())
                            .toList());
                    val rawTx = rpcClient.getRawTransaction(tx.getTxId().toString());
                    if (rawTx.time() != null)
                        resultTx.setTime(Timestamp.from(rawTx.time().toInstant()));
                    else resultTx.setTime(Timestamp.valueOf(LocalDateTime.now()));
                    val txInput = rawTx.vIn().stream()
                            .map(in -> in.getTransactionOutput().value())
                            .reduce(BigDecimal::add).orElse(BigDecimal.ZERO);
                    val txOutput = rawTx.vOut().stream()
                            .map(BitcoindRpcClient.RawTransaction.Out::value)
                            .reduce(BigDecimal::add).orElse(BigDecimal.ZERO);
                    resultTx.setFee(txInput.subtract(txOutput));
                    if (!receiving) {
                        val amount = resultTx.getAmount().add(resultTx.getFee());
                        if (amount.compareTo(BigDecimal.ZERO) < 0) resultTx.setAmount(amount);
                    }
                    if (rawTx.confirmations() != null)
                        resultTx.setConfirmations(rawTx.confirmations().longValue());
                    else resultTx.setConfirmations(0L);
                    return resultTx;
                }).collect(Collectors.toSet());
    }

    private BigDecimal getBalance(WalletEntity entity, Wallet.BalanceType type) {
        Coin balance;
        try (val kit = kitFromEntity(entity)) {
            balance = kit.wallet.getBalance(type);
        }
        return balance.toBtc();
    }

    @Override
    public @NonNull BigDecimal getAvailableBalance(@NonNull WalletEntity entity) {
        return getBalance(entity, Wallet.BalanceType.AVAILABLE);
    }

    @Override
    public BigDecimal getEstimatedBalance(@NonNull WalletEntity wallet) {
        return getBalance(wallet, Wallet.BalanceType.ESTIMATED);
    }

    private Transaction txFromOutputs(@NonNull Map<String, BigDecimal> outputs) {
        val tx = new Transaction();
        for (val entry : outputs.entrySet()) {
            val target = entry.getKey();
            val amount = entry.getValue();
            if (amount.compareTo(Coin.satoshiToBtc(546)) <= 0)
                throw new Wallet.DustySendRequested();
            tx.addOutput(Coin.ofBtc(amount), BitcoinUtils
                    .addressFromString(params().network(), target));
        }
        return tx;
    }

    private SendRequest getSendRequest(
            @NonNull Map<String, BigDecimal> dest,
            @Nullable BigDecimal fee, boolean recipientsPayFees) {
        val request = SendRequest.forTx(txFromOutputs(dest));
        request.ensureMinRequiredFee = true;
        request.recipientsPayFees = recipientsPayFees;
        if (fee != null && fee.compareTo(BigDecimal.ZERO) > 0) {
            request.setFeePerVkb(Coin.ofBtc(fee));
        }

        return request;
    }

    @Override
    public Map<Integer, BigDecimal> feeEstimates() {
        val blocks = new ArrayList<>(List.of(1, 2, 5, 7, 15));
        blocks.addAll(IntStream.range(2, 101).map(i -> i * 10).boxed().toList());
        Map<Integer, BigDecimal> estimates = new HashMap<>();
        for (val nBlocks : blocks) {
            if (estimates.containsKey(nBlocks)) continue;
            val est = rpcClient.estimateSmartFee(nBlocks);
            if (estimates.containsValue(est.feeRate())) continue;
            estimates.put(est.blocks(), est.feeRate());
        }
        return estimates;
    }

    @Override
    public String send(@NonNull WalletEntity wallet, @NonNull Map<String, BigDecimal> outputs)
            throws AddressFormatException, IllegalArgumentException,
            Wallet.DustySendRequested, InsufficientMoneyException {
        try (val kit = kitFromEntity(wallet)) {
            if (!kit.peerGroup.isRunning())
                kit.peerGroup.start();
            val id = kit.wallet.sendCoins(getSendRequest(outputs, null, false))
                    .transaction().getTxId().toString();
            Thread.sleep(3000);
            return id;
        } catch (InterruptedException e) {
            return null;
        }
    }

    @Override
    public String sendWithFee(@NonNull WalletEntity wallet,
                              @NonNull Map<String, BigDecimal> outputs,
                              @Nullable BigDecimal fee, boolean recipientsPayFee
    ) throws AddressFormatException, IllegalArgumentException,
            Wallet.DustySendRequested, InsufficientMoneyException {
        try (val kit = kitFromEntity(wallet)) {
            if (!kit.peerGroup.isRunning())
                kit.peerGroup.start();
            val id = kit.wallet.sendCoins(getSendRequest(outputs, fee, recipientsPayFee))
                    .transaction().getTxId().toString();
            Thread.sleep(3000);
            return id;
        } catch (InterruptedException e) {
            return null;
        }
    }

    @Override
    public @NonNull BigDecimal getAvailableBalance(
            @NonNull WalletEntity entity, @NotNull String addr) {
        final Coin balance;
        try (val kit = kitFromEntity(entity)) {
            val selector = new MemorizingCoinSelector();
            balance = kit.wallet.getBalance(selector);
        }
        return balance.toBtc();
    }

    @Override
    public void syncWallet(@NonNull WalletEntity entity) {
        // kitFromEntity() do all necessary work for initializing
        // and/or synchronization the wallet
        kitFromEntity(entity).close();
    }

    @Override
    public @Async void syncWalletAsync(@NonNull WalletEntity entity) {
        syncWallet(entity);
    }

    @Override
    public boolean importPrivateKeys(@NonNull WalletEntity wallet, List<String> privates) {
        Set<ECKey> keys;
        List<ECKey> alreadyImportedKeys;
        try (val kit = kitFromEntity(wallet)) {
            keys = privates.stream()
                    .distinct()
                    .map(str -> {
                        try {
                            ECKey key;
                            try {
                                key = DumpedPrivateKey.fromBase58(params().network(), str).getKey();
                            } catch (Exception _) {
                                byte[] privateBytes;
                                try {
                                    privateBytes = HexFormat.of().parseHex(str);
                                } catch (IllegalArgumentException _) {
                                    return null;
                                }
                                try {
                                    key = ECKey.fromPrivate(privateBytes, true);
                                } catch (Exception _) {
                                    try {
                                        key = ECKey.fromPrivate(privateBytes, false);
                                    } catch (Exception _) {
                                        return null;
                                    }
                                }
                            }
                            if (key == null) return null;

                            val imported = kit.wallet.getImportedKeys().contains(key);
                            if (imported) return null;

                            val addresses = getAddressesFromKey(key);
                            val issuedKeys = kit.wallet.getIssuedReceiveKeys();
                            val issuedAddresses = getAddresses(kit.wallet,
                                    issuedKeys.size() + 100);

                            val keyMine = issuedKeys.contains(key);
                            if (keyMine) return null;

                            boolean addrMine = addresses.stream()
                                    .anyMatch(addrStr -> {
                                        val addr = kit.wallet.parseAddress(addrStr);
                                        return kit.wallet.isAddressMine(addr) ||
                                                kit.wallet.isAddressWatched(addr);
                                    });
                            if (addrMine) return null;


                            addrMine = issuedAddresses.stream()
                                    .anyMatch(issuedAddr -> addresses.stream()
                                            .anyMatch(issuedAddr::equals));
                            if (addrMine) return null;

                            return key;
                        } catch (Exception e) {
                            log.debug("Error while reading private key", e);
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            alreadyImportedKeys = kit.wallet.getImportedKeys();
        } catch (Exception e) {
            log.error("Error while importing private keys", e);
            return false;
        }
        if (!keys.isEmpty()) {
            keys.addAll(alreadyImportedKeys);
            CompletableFuture.runAsync(() -> kitFromEntity(wallet, keys).close());
        }
        return !keys.isEmpty();
    }

    private MemorizerWalletExtension getAddressMemorizerFromWallet(Wallet wallet) {
        return (MemorizerWalletExtension) wallet.getExtensions().get(MemorizerWalletExtension.id());
    }

    private SyncWalletExtension getSyncTimeMemorizerFromWallet(Wallet wallet) {
        return (SyncWalletExtension) wallet.getExtensions().get(SyncWalletExtension.id());
    }

    @Override
    public String currentReceiveAddress(@NonNull WalletEntity walletEntity, @NonNull String type) {
        val net = params().network();
        val scriptType = ScriptType.of(type.toLowerCase());
        if (!List.of(SUPPORTED_RECEIVE_SCRIPTS).contains(scriptType))
            throw new IllegalArgumentException(STR."Unsupported script type: \{scriptType}");
        try (val kit = kitFromEntity(walletEntity)) {
            val wallet = kit.getWallet();
            wallet.currentReceiveKey(); // bitcoinj may give an unexpected result at the 1st request
            return (switch (scriptType) {
                case P2WPKH -> wallet.currentReceiveAddress();
                case P2PKH -> {
                    val memorizer = getAddressMemorizerFromWallet(wallet);
                    val unusedAddress = wallet.getIssuedReceiveAddresses().parallelStream()
                            .filter(addr -> memorizer.unknown(addr.toString()))
                            .filter(addr -> addr.getOutputScriptType() == ScriptType.P2PKH)
                            .filter(addr -> wallet.getTransactions(false).stream()
                                    .noneMatch(tx -> tx.getOutputs().stream()
                                            .anyMatch(out -> out.getScriptPubKey().getToAddress(net).equals(addr))))
                            .findFirst();
                    if (unusedAddress.isPresent()) yield unusedAddress.get();
                    yield wallet.freshReceiveAddress(ScriptType.P2PKH);
                }
                default ->
                        throw new IllegalArgumentException(STR."Unsupported script type: \{scriptType}");
            }).toString();
        }
    }

    @Override
    public String currentReceiveAddress(@NonNull WalletEntity walletEntity) {
        return currentReceiveAddress(walletEntity, defaultType());
    }

    @Override
    public Set<String> types() {
        return Arrays.stream(SUPPORTED_RECEIVE_SCRIPTS).map(ScriptType::id)
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    public String defaultType() {
        return DEFAULT_SCRIPT_TYPE.id();
    }

    @Override
    public String freshReceiveAddress(
            @NonNull WalletEntity walletEntity, String type) throws IllegalArgumentException {
        val scriptType = ScriptType.of(type.toLowerCase());
        try (val kit = kitFromEntity(walletEntity)) {
            val wallet = kit.getWallet();
            val addr = wallet.freshReceiveAddress(scriptType).toString();
            if (scriptType == ScriptType.P2PKH) {
                val memorizer = getAddressMemorizerFromWallet(wallet);
                memorizer.memorize(addr);
            }
            return addr;
        }
    }

    @Override
    public String freshReceiveAddress(@NonNull WalletEntity walletEntity) {
        return freshReceiveAddress(walletEntity, DEFAULT_SCRIPT_TYPE.id());
    }

    @Override
    public void exportWallet(@NonNull WalletEntity walletEntity, @NonNull OutputStream os) {
        try (val kit = kitFromEntity(walletEntity); PrintStream out = new PrintStream(os)) {
            out.println(STR."\{"-".repeat(55)} Your Pecunia Wallet (\{
                    StringUtils.capitalize(getName().toLowerCase())}) Export \{"-".repeat(55)}");
            out.println();
            out.println(STR."Master public key (xPub): \{
                    kit.wallet.getWatchingKey().dropPrivateBytes().dropParent()
                            .serializePubB58(kit.params.network())}");
            out.println();
            if (kit.wallet.getBalance().toSat() == 0) {
                out.println("You have no addresses with a balance right now.");
                return;
            }
            out.println("""
                    There are your addresses and private keys encoded in the form
                    used by Bitcoin Core's "dumpprivkey" and "importprivkey" commands:
                    """);
            out.format("%1$-66s %2$-66s %3$s\n", "Address", "Private", "Balance");

            val selector = new MemorizingCoinSelector();
            kit.wallet.getBalance(selector);
            val balances = selector.getBalancePerAddress(kit.wallet.network());
            val addresses = new ArrayList<>(balances.keySet()).stream().sorted((addr1, addr2) -> {
                val compared = balances.get(addr1) - balances.get(addr2);
                if (compared > 0) return -1;
                if (compared < 0) return 1;
                else return 0;
            }).toList();
            val wal = kit.wallet;
            val importedAddresses = getAddressesFromKeys(wal.getImportedKeys()).stream()
                    .filter(addresses::contains)
                    .collect(Collectors.toUnmodifiableSet());
            for (val addr : addresses) {
                val addrPrivate = wal.findKeyFromAddress(wal.parseAddress(addr))
                        .getPrivateKeyEncoded(kit.params.network()).toString();
                val addrImported = importedAddresses.contains(addr);
                out.format("%1$-66s %2$-66s %3$s\n", addr + (addrImported ? "*" : ""), addrPrivate,
                        Coin.valueOf(balances.get(addr)).toFriendlyString());
            }
            if (!importedAddresses.isEmpty()) {
                out.println();
                out.println("* – address has been imported to the wallet.");
            }
            out.flush();
        }
    }

    private Set<String> getAddressesFromKey(ECKey key) {
        return Arrays.stream(SUPPORTED_RECEIVE_SCRIPTS)
                .map(script -> BitcoinUtils.addressFromKey(params().network(), key, script))
                .collect(Collectors.toUnmodifiableSet());
    }

    private Set<String> getAddressesFromKeys(Collection<ECKey> keys) {
        return keys.stream()
                .flatMap(key -> getAddressesFromKey(key).stream())
                .collect(Collectors.toUnmodifiableSet());
    }

    private String getWalletFileNameFromEntity(@NonNull WalletEntity walletEntity) {
        return String.format(WALLET_NAME_TEMPLATE, testnet ? "test" : "main",
                getAbbreviation(), walletEntity.getId().toString()).toLowerCase();
    }

    private File getWalletFileFromEntity(@NonNull WalletEntity walletEntity) {
        return new File(walletsDir, getWalletFileNameFromEntity(walletEntity));
    }

    private String getStoreFileNameFromEntity(@NonNull WalletEntity walletEntity) {
        return String.format(STORE_NAME_TEMPLATE, testnet ? "test" : "main",
                getAbbreviation(), walletEntity.getId().toString()).toLowerCase();
    }

    private File getStoreFileFromEntity(@NonNull WalletEntity walletEntity) {
        return new File(storesDir, getStoreFileNameFromEntity(walletEntity));
    }

    private Transaction hexToTx(String hex) {
        return Transaction.read(ByteBuffer.wrap(HexFormat.of().parseHex(hex)));
    }

    private List<String> getAddresses(Wallet wallet, int keyCount) {
        val scriptTypes = Arrays.asList(SUPPORTED_RECEIVE_SCRIPTS);
        // interleave addresses of all types
        return IntStream.range(0, keyCount * scriptTypes.size())
                .mapToObj(i -> scriptTypes.get(i % scriptTypes.size()))
                .flatMap(script -> Stream.of(wallet.freshReceiveAddress(script).toString()))
                .collect(Collectors.toList());
    }

    private Consumer<WalletKit> getListener(
            @NonNull WalletEntity entity,
            @NonNull WalletKit kit,
            @NonNull CountDownLatch latch) {
        return acceptedKit -> {
            if (acceptedKit.entity.equals(entity)) {
                kit.setEntity(entity);
                kit.setUsers(acceptedKit.users);
                kit.setChain(acceptedKit.chain);
                kit.setStore(acceptedKit.store);
                kit.setPeerGroup(acceptedKit.peerGroup);
                kit.setWallet(acceptedKit.wallet);
                kit.setLoadedStore(acceptedKit.loadedStore);
                latch.countDown();
            }
        };
    }

    // return true if kit got from another initializer, false otherwise
    private boolean checkInitQueueAndAwait(
            WalletKit kit, WalletEntity entity, Duration timeout) {
        CountDownLatch latch = new CountDownLatch(1);
        Consumer<WalletKit> listener = getListener(entity, kit, latch);
        try {
            boolean walletInitializing;
            synchronized (currentlyInitializingWallets) {
                walletInitializing = currentlyInitializingWallets.contains(entity.getId());
            }
            if (walletInitializing) {
                kitInitializedListeners.add(listener);
                log.debug("Waiting for wallet initialization");
                return latch.await(timeout.toMillis(), TimeUnit.MILLISECONDS);
            } else return false;
        } catch (InterruptedException e) {
            log.error("Initialization queue awaiter interrupted", e);
            return false;
        } finally {
            kitInitializedListeners.remove(listener);
        }
    }

    // return true if kit got from another synchronizer, false otherwise
    private boolean checkSyncQueueAndAwait(
            WalletKit kit, WalletEntity entity, Duration timeout) {
        CountDownLatch latch = new CountDownLatch(1);
        Consumer<WalletKit> listener = getListener(entity, kit, latch);
        try {
            boolean walletSynchronizing;
            synchronized (currentlySynchronizingWallets) {
                walletSynchronizing = currentlySynchronizingWallets.contains(entity.getId());
            }
            if (walletSynchronizing) {
                kitSynchronizedListeners.add(listener);
                log.debug("Waiting for wallet synchronization");
                return latch.await(timeout.toMillis(), TimeUnit.MILLISECONDS);
            } else return false;
        } catch (InterruptedException e) {
            log.error("Synchronization queue awaiter interrupted", e);
            return false;
        } finally {
            kitSynchronizedListeners.remove(listener);
        }
    }

    private void initKit(WalletKit kit, WalletEntity entity, Set<ECKey> keys) {
        // If init process it already going, we don't need to
        // duplicate it. Therefore, waiting for init and get its result
        try {
            boolean waiting;
            synchronized (currentlyInitializingWallets) {
                waiting = currentlyInitializingWallets.contains(entity.getId());
                if (!waiting) currentlyInitializingWallets.add(entity.getId());
            }
            if (waiting && checkInitQueueAndAwait(kit, entity, Duration.ofHours(15))) return;

            initializationStateChangedEventPublisher.publishInitializing(entity, this);

            val walletName = getWalletFileNameFromEntity(entity);
            log.debug("Start initializing wallet {}", walletName);

            if (!rpcClient.walletExists(walletName)) {
                log.debug("Creating wallet {}", walletName);
                rpcClient.createWallet(walletName);
            }
            log.debug("Loading wallet {}", walletName);
            try {rpcClient.loadWallet(walletName);} catch (Exception _) {}
            val rpc = rpcClient.atWallet(walletName);
            log.debug("Rpc now at wallet {}", walletName);

            if (kit.store == null || kit.chain == null || kit.peerGroup == null)
                writePeerAndBlockchainToWallet(kit, entity);

            kit.wallet.reset();

            // Segmentally check address' balances while the last 2/3 part of the segment isn't empty
            // and import existing transactions to the kit
            boolean nonEmptyAddrInEnd; // there is an address with a transaction at the end of the segment
            int scanStartHeight;
            Instant scanStartTime;
            int iteration = 0;
            val keyCount = ADDRESS_SYNC_SEGMENT / SUPPORTED_RECEIVE_SCRIPTS.length;

            List<BitcoindRpcClient.Transaction> transactionList;
            do {
                iteration++;
                val addresses = new ArrayList<>(getAddresses(kit.wallet, keyCount));

                log.debug("TEST ONLY {}", addresses);

                int externalAddressCount = 0;
                if (iteration == 1 && !keys.isEmpty()) {
                    log.debug("Start importing privates");
                    kit.wallet.importKeys(keys.stream().toList());
                    val externalAddresses = getAddressesFromKeys(keys);
                    externalAddresses.forEach(addresses::addFirst);
                    externalAddressCount = externalAddresses.size();
                    log.debug("Next addresses added to scan: {}", externalAddresses);
                }

                long startPoint = System.currentTimeMillis();
                log.debug("Start importing addresses, iteration {}, addresses: {}", iteration, addresses);
                rpc.importAddresses(addresses.toArray(new String[]{}));
                log.debug("Addresses imported after {}s",
                        ((System.currentTimeMillis() - startPoint) / 1000));
                startPoint = System.currentTimeMillis();
                log.debug("Blockchain rescan started");
                scanStartHeight = rpcClient.getBlock(rpcClient.getBestBlockHash()).height();
                scanStartTime = Instant.now();
                rpc.rescanBlockchain();
                log.debug("Blockchain rescanned after {}s",
                        (System.currentTimeMillis() - startPoint) / 1000);

                transactionList = rpc.listTransactions();
                log.debug("Transaction list: {}", transactionList);

                val txs = transactionList;
                nonEmptyAddrInEnd = addresses.stream()
                        .skip(externalAddressCount)
                        .skip((long) (1 / 4f * ADDRESS_SYNC_SEGMENT))
                        .anyMatch(addr -> txs.stream()
                                .map(BitcoindRpcClient.Transaction::address)
                                .anyMatch(txAddr -> txAddr.equals(addr)));
            } while (nonEmptyAddrInEnd);


            transactionList.parallelStream()
                    .sorted(Comparator.comparing(BitcoindRpcClient.Transaction::category,
                            (c1, c2) -> {
                                if (c1.equalsIgnoreCase(c2)) return 0;
                                if (c1.equalsIgnoreCase("send")) return 1;
                                else return -1;
                            }))
                    .forEachOrdered(walletTx -> {
                        Context.propagate(new Context());
                        log.debug("Found transaction {}", walletTx);
                        val tx = hexToTx(walletTx.raw().hex());
                        // Bitcoinj trust transaction only if it is self-signed or
                        // peerGroup said that many peers have seen the transaction.
                        // It is taken to BalanceType.AVAILABLE computation only
                        // if at least one peer broadcasts it
                        tx.getConfidence().setSource(TransactionConfidence.Source.SELF);
                        tx.getConfidence().markBroadcastBy(PeerAddress.inet(
                                rpcClient.nodeAddr(),
                                Services.of(Services.NODE_NETWORK),
                                Instant.now()));
                        kit.wallet.maybeCommitTx(tx);
                    });


            kit.wallet.setLastBlockSeenHeight(scanStartHeight);
            kit.wallet.setLastBlockSeenTime(scanStartTime);
            kit.peerGroup.setFastCatchupTime(scanStartTime);

            kit.setStoreHead(rpcClient.getBlock(scanStartHeight));
            kit.synchronize();

            // Free up memory since we need Bitcoin Core's wallet only at this method
            CompletableFuture.runAsync(() -> rpc.deleteWallet(walletName));

            try {
                kit.wallet.saveToFile(new File(walletsDir, walletName));
            } catch (IOException e) {
                log.warn("Failed to save wallet after init", e);
            }

            kitInitializedListeners.forEach(_listener -> CompletableFuture.runAsync(() ->
                    _listener.accept(kit), listenersExecutor));
        } catch (Exception e) {
            log.error("Exception while initializing kit", e);
        } finally {
            this.initializationStateChangedEventPublisher.publishInitialized(entity, this);
            synchronized (currentlyInitializingWallets) {
                currentlyInitializingWallets.remove(entity.getId());
            }
        }
    }

    private BlockStore loadStore(
            NetworkParameters params, File file, WalletKit kit, int aTry) throws BlockStoreException {
        try {
            log.debug("Try reading store from file");
            val store = new SPVBlockStore(params, file);
            kit.loadedStore = new WalletKit.BlockStoreSnapshot(
                    store.getChainHead().getHeight(),
                    store.getChainHead());
            return store;
        } catch (BlockStoreException bse) {
            if (++aTry < 5) {
                log.debug("Failed to read store, trying again in 1s");
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException _) {
                    throw new BlockStoreException(bse);
                }
                return loadStore(params, file, kit, aTry);
            } else {
                log.debug("Failed to read store", bse);
                throw new BlockStoreException(bse);
            }
        }
    }

    private void writePeerAndBlockchainToWallet(
            WalletKit kit, WalletEntity entity, boolean fresh) {
        val params = kit.params;
        BlockStore store = null;
        BlockChain chain;
        PeerGroup peerGroup;

        val storeFile = getStoreFileFromEntity(entity);
        if (storeFile.exists()) {
            try {
                store = loadStore(params, storeFile, kit, 0);
                log.debug("Store is read with head {}", store.getChainHead());
            } catch (BlockStoreException e) {
                if (!storeFile.delete()) {
                    val err = STR."Problem occurred while deleting store \{
                            getStoreFileFromEntity(entity)} after read failure.";
                    log.error(err);
                    emailService.reportProblemAsync(new Throwable(), err);
                }
            }
        }

        log.debug("Store is loaded: {}", store != null);
        if (store == null) {
            try {
                store = new SPVBlockStore(params, storeFile);
                kit.loadedStore = new WalletKit.BlockStoreSnapshot(
                        store.getChainHead().getHeight(),
                        store.getChainHead());
            } catch (BlockStoreException e) {
                log.warn("Failed to load block store");
                // Storage with part walletEntity.hashCode() may be re accessed in future 'cause
                // of consistency of hash code, though the consistency may cause exceptions.
                // This is why we also attempt to use file with random part at name, that alas
                // can't be reaccessed. So we save the store in the first case as an extra file
                // that is stored for a longer time than a temp file we use in the second case.
                try {
                    store = new SPVBlockStore(params, new File(storesDir,
                            STR."extra-\{entity.hashCode()}-\{storeFile.getName()}"));
                    kit.loadedStore = new WalletKit.BlockStoreSnapshot(
                            store.getChainHead().getHeight(),
                            store.getChainHead());
                } catch (BlockStoreException e1) {
                    try {
                        store = new SPVBlockStore(params, new File(storesDir,
                                STR."tmp-\{RandomStringUtils.randomAlphanumeric(4)}-\{
                                        storeFile.getName()}"));
                        kit.loadedStore = new WalletKit.BlockStoreSnapshot(
                                store.getChainHead().getHeight(),
                                store.getChainHead());
                    } catch (BlockStoreException e2) {
                        val err = STR."Unable to load wallet with root causes\n\{
                                ExceptionUtils.getStackTrace(e2)}\n\{
                                ExceptionUtils.getStackTrace(e1)}\n\{
                                ExceptionUtils.getStackTrace(e)}";
                        emailService.reportProblem(new Throwable(), err);
                        throw new RuntimeException(e2);
                    }
                }
            }
        }

        kit.setStore(store);
        if (fresh) kit.setStoreHead(rpcClient.getBlock(rpcClient.getBestBlockHash()));

        try {
            log.debug("Creating chain");
            chain = new BlockChain(params.network(), kit.wallet, store);
            log.debug("Chain created");
        } catch (BlockStoreException e) {
            emailService.reportProblem(new Throwable(),
                    STR."Blockchain excpetion:\n\{ExceptionUtils.getStackTrace(e)}");
            throw new RuntimeException(e);
        }
        log.debug("Creating peer group");
        peerGroup = new PeerGroup(params.network(), chain);
        log.debug("Peer group created");
        peerGroup.setBloomFilteringEnabled(false);

        peerGroup.addWallet(kit.wallet);
        chain.addWallet(kit.wallet);

        log.debug("Fulfilling kit for {}", entity.getId());
        kit.setChain(chain);
        kit.setPeerGroup(peerGroup);
    }

    private void writePeerAndBlockchainToWallet(WalletKit kit, WalletEntity entity) {
        writePeerAndBlockchainToWallet(kit, entity, false);
    }

    private @NonNull WalletKit kitFromEntity(@NonNull WalletEntity walletEntity,
                                             @NonNull Set<ECKey> additionalKeys) {
        log.debug("Requested kit for entity {}", walletEntity.getId());
        Context.propagate(new Context());
        val params = params();

        WalletKit kit = new WalletKit();
        kit.setParams(params);

        if (checkSyncQueueAndAwait(kit, walletEntity, Duration.ofMinutes(5)) ||
                checkInitQueueAndAwait(kit, walletEntity, Duration.ofHours(12))) {
            kit.users.incrementAndGet();
            return kit;
        }

        val cachedKit = cachedKits.stream().filter(_kit -> _kit.entity.equals(walletEntity)).findAny();
        if (cachedKit.isPresent()) {
            cachedKit.get().users.incrementAndGet();
            return cachedKit.get();
        }

        Wallet wallet = null;

        val walletFile = getWalletFileFromEntity(walletEntity);
        if (walletFile.exists()) {
            try {
                wallet = FWallet.loadFromFile(walletFile,
                        new MemorizerWalletExtension(),
                        new SyncWalletExtension());
            } catch (UnreadableWalletException e) {
                log.warn("Cannot load wallet from file", e);
                rpcClient.deleteWallet(getWalletFileNameFromEntity(walletEntity));
                if (!walletFile.delete()) {
                    val err = STR."Problem occurred while deleting wallet \{
                            getWalletFileNameFromEntity(walletEntity)} after read failure.";
                    log.error(err);
                    emailService.reportProblemAsync(new Throwable(), err);
                }
            }
        }

        boolean freshWallet = wallet == null;
        if (wallet.getExtensions().get(MemorizerWalletExtension.id()) == null)
            wallet.addExtension(new MemorizerWalletExtension());
        if (wallet.getExtensions().get(SyncWalletExtension.id()) == null)
            wallet.addExtension(new SyncWalletExtension());

        SyncWalletExtension syncWalletExtension = getSyncTimeMemorizerFromWallet(wallet);
        if (!walletEntity.isExternal() && syncWalletExtension.getLastSyncTime() != null &&
                syncWalletExtension.getLastSyncTime()
                        .isBefore(walletEntity.getCreated().toInstant())) {
            syncWalletExtension.setLastSyncTime(walletEntity.getCreated());
        }

        kit = new WalletKit(params, walletEntity, wallet, null, null, null);

        log.debug(STR."Wallet is\{freshWallet ? "" : "n't"} fresh");
        if (additionalKeys.isEmpty() && (!freshWallet || !walletEntity.isExternal())) {
            kit.synchronize(freshWallet);
        } else initKit(kit, walletEntity, additionalKeys);

        kit.users.incrementAndGet();
        cachedKits.add(kit);
        wallet.autosaveToFile(walletFile, Duration.ofSeconds(2), null);
        return kit;
    }

    private @NonNull WalletKit kitFromEntity(@NonNull WalletEntity entity) {
        return kitFromEntity(entity, Collections.emptySet());
    }

    @Data
    @EqualsAndHashCode(of = "entity")
    @NoArgsConstructor
    private class WalletKit implements AutoCloseable {
        record BlockStoreSnapshot(int headHeight, StoredBlock head) {}

        private NetworkParameters params;
        private Wallet wallet;
        private BlockStore store;
        private BlockStoreSnapshot loadedStore;
        private BlockChain chain;
        private PeerGroup peerGroup;
        private WalletEntity entity;

        AtomicInteger users = new AtomicInteger();

        public WalletKit(@NonNull NetworkParameters params,
                         @NonNull WalletEntity entity,
                         @NonNull Wallet wallet,
                         BlockStore store,
                         BlockChain chain,
                         PeerGroup peerGroup) {
            this.entity = entity;
            this.params = params;
            this.wallet = wallet;
            this.store = store;
            this.chain = chain;
            this.peerGroup = peerGroup;
        }

        public void synchronize(boolean fresh) {
            try {
                boolean waiting;

                synchronized (currentlySynchronizingWallets) {
                    waiting = currentlySynchronizingWallets.contains(entity.getId());
                    if (!waiting) currentlySynchronizingWallets.add(entity.getId());
                }
                if (waiting) {
                    if (checkSyncQueueAndAwait(this, entity, Duration.ofMinutes(2))) return;
                }

                Context.propagate(new Context());
                if (store == null || chain == null || peerGroup == null)
                    writePeerAndBlockchainToWallet(this, entity, fresh);

                val receiveKeysCount = wallet.getIssuedReceiveKeys().size();
                if (receiveKeysCount < 15)
                    wallet.freshKeys(KeyChain.KeyPurpose.RECEIVE_FUNDS, 15 - receiveKeysCount);

                log.debug("Kit is synchronizing at wallet {}", entity.getId());
                val syncWalletExtension = getSyncTimeMemorizerFromWallet(wallet);

                Instant catchUp = syncWalletExtension.getLastSyncTime();
                if (catchUp == null || catchUp.compareTo(Instant.parse("2009-01-01T00:00:00Z")) < 0) {
                    catchUp = wallet.earliestKeyCreationTime();
                    try {
                        if (catchUp.equals(Instant.MAX) ||
                                catchUp.compareTo(Instant.parse("2009-01-01T00:00:00Z")) < 0) { // blockchain was invented at Jan 2009
                            catchUp = entity.getCreated().toInstant();
                            log.warn("Last seen block and earliest key time are undefined so using entity birthtime: {}", catchUp);
                        } else
                            log.warn("Wallet last seen block in undefined, so try using earliest key time: {}", catchUp);
                    } catch (Exception e) {
                        log.error("Catchup defining error", e);
                    }
                }

                val hourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
                if (catchUp.isAfter(hourAgo)) catchUp = hourAgo;
                log.info("Caught up at {}", catchUp);

                try {
                    val checkpoints = bitcoinCheckpointService.getCheckpoints();
                    log.info("Got checkpoints");
                    CheckpointManager.checkpoint(params, checkpoints, store, catchUp);
                } catch (IOException | BlockStoreException e) {
                    log.warn("Failed to load checkpoints before {}", catchUp, e);
                }

                peerGroup.setFastCatchupTime(catchUp);
                val syncStartTime = Instant.now();
                val pt = new DownloadProgressTracker();
                peerGroup.startBlockChainDownload(pt);
                peerGroup.startAsync();
                pt.await();

                wallet.setLastBlockSeenTime(syncStartTime);
                syncWalletExtension.setLastSyncTime(Timestamp.from(syncStartTime));
                wallet.saveToFile(getWalletFileFromEntity(entity));

                kitSynchronizedListeners.forEach(_listener -> CompletableFuture.runAsync(() ->
                        _listener.accept(this), listenersExecutor));
            } catch (InterruptedException e) {
                log.error("Kit synchronization interrupted", e);
                synchronize();
            } catch (IOException e) {
                log.warn(STR."Failed to save wallet \{entity.getId()}", e);
            } catch (Exception e) {
                log.error("Unknown error", e);
            } finally {
                synchronized (currentlySynchronizingWallets) {
                    currentlySynchronizingWallets.remove(entity.getId());
                }
            }
        }

        public void setStoreHead(BitcoindRpcClient.Block rpcBlock) {
            try {
                val block = Block.read(ByteBuffer.wrap(HexFormat.of()
                        .parseHex(rpcClient.getRawBlock(rpcBlock.hash()))));
                val storedBlock = new StoredBlock(block,
                        new BigInteger(HexFormat.of().parseHex(rpcBlock.chainwork())),
                        rpcBlock.height());
                store.put(storedBlock);
                store.setChainHead(storedBlock);
            } catch (Exception e) {
                log.error("Error pushing chain head to store", e);
            }
        }

        public void synchronize() {
            synchronize(false);
        }

        @Override
        public void close() {
            if (users.decrementAndGet() > 0) return;
            log.info("Closing kit {}", entity.getId());
            try {
                try {
                    if (store.getChainHead().getHeight() < loadedStore.headHeight) {
                        store.put(loadedStore.head);
                        store.setChainHead(loadedStore.head);
                    }
                    log.debug("Store is saving with head {}", store.getChainHead());
                } catch (Exception e) {
                    log.debug("Error restoring chain head", e);
                }
                cachedKits.remove(this);
                try {
                    peerGroup.stop();
                } catch (IllegalStateException ise) {
                    log.warn("Fucking peer group threw exception", ise);
                }
                try {
                    store.close();
                } catch (BlockStoreException | NullPointerException e) {
                    log.warn("Exception caught closing store", e);
                }
                wallet.saveToFile(getWalletFileFromEntity(entity));
                log.info("Kit {} closed", entity.getId());
            } catch (Exception e) {
                log.error("Error closing kit", e);
            }
        }
    }
}