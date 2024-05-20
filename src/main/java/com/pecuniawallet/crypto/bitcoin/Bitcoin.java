package com.pecuniawallet.crypto.bitcoin;

import com.pecuniawallet.crypto.base.SingleCoinMultiAddrNetwork;
import com.pecuniawallet.model.WalletEntity;
import com.pecuniawallet.repo.WalletRepository;
import com.pecuniawallet.service.EmailService;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.bitcoinj.base.Coin;
import org.bitcoinj.base.ScriptType;
import org.bitcoinj.base.exceptions.AddressFormatException;
import org.bitcoinj.core.*;
import org.bitcoinj.core.listeners.DownloadProgressTracker;
import org.bitcoinj.params.MainNetParams;
import org.bitcoinj.params.TestNet3Params;
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

import javax.annotation.concurrent.GuardedBy;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.io.PrintStream;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@Component
public class Bitcoin implements SingleCoinMultiAddrNetwork {

    // wallet and store filenames shouldn't start with "tmp-" or "extra-"
    // since files with such prefixes are regularly deleted
    protected static final String WALLET_NAME_TEMPLATE = "%s.%s.%s.wallet"; // chain.shortname.id.wallet
    protected static final String STORE_NAME_TEMPLATE = "%s.%s.%s.store"; // chain.shortname.id.store
    protected static final ScriptType DEFAULT_SCRIPT_TYPE = ScriptType.P2WPKH;
    protected static final ScriptType[] SUPPORTED_RECEIVE_SCRIPTS = {
            ScriptType.P2PKH,
            ScriptType.P2WPKH
    };
    protected final static int ADDRESS_SYNC_SEGMENT = 100;

    @Autowired private EmailService emailService;
    @Qualifier("bitcoinJsonRpcClient") @Autowired
    private BitcoinJsonRpcClient rpcClient;
    @Autowired private WalletRepository walletRepo;
    @Autowired private BitcoinCheckpointService bitcoinCheckpointService;

    private final boolean testnet;
    private final File walletsDir;
    private final File storesDir;

    private final Executor listenersExecutor = Executors.newSingleThreadExecutor();
    private final Set<Consumer<WalletKit>> kitInitializedListeners = new CopyOnWriteArraySet<>();
    @GuardedBy("initializingWalletsLock")
    private final Set<UUID> currentlyInitializingWallets = new ConcurrentSkipListSet<>();

    private final Set<Consumer<WalletKit>> kitSynchronizedListeners = new CopyOnWriteArraySet<>();
    @GuardedBy("synchronizingWalletsLock")
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

    private NetworkParameters params() {
        return testnet ? TestNet3Params.get() : MainNetParams.get();
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
                    resultTx.setAmount(BigInteger.valueOf(tx.getValue(wallet).getValue()));
                    resultTx.setTime(Timestamp.from(tx.updateTime().orElseGet(() ->
                            rpcClient.getRawTransaction(resultTx.getId()).time().toInstant())));
                    val address = tx.getOutputs().stream()
                            .filter(out -> !out.isMine(wallet))
                            .map(TransactionOutput::getScriptPubKey)
                            .findAny()
                            .orElse(tx.getOutputs().getFirst().getScriptPubKey())
                            .getToAddress(params().network()).toString();
                    resultTx.setAddress(address);
                    return resultTx;
                }).collect(Collectors.toSet());
    }

    private BigInteger getBalance(WalletEntity entity, Wallet.BalanceType type) {
        Coin balance;
        try (val kit = kitFromEntity(entity)) {
            balance = kit.wallet.getBalance(type);
        }
        return BigInteger.valueOf(balance.toSat());
    }

    @Override
    public @NonNull BigInteger getAvailableBalance(@NonNull WalletEntity entity) {
        return getBalance(entity, Wallet.BalanceType.AVAILABLE);
    }

    @Override
    public BigInteger getEstimatedBalance(@NonNull WalletEntity wallet) {
        return getBalance(wallet, Wallet.BalanceType.ESTIMATED);
    }

    @Override
    public @NonNull BigInteger getAvailableBalance(@NonNull WalletEntity entity, @NotNull String addr) {
        final Coin balance;
        try (val kit = kitFromEntity(entity)) {
            val selector = new MemorizingCoinSelector();
            balance = kit.wallet.getBalance(selector);
        }
        return BigInteger.valueOf(balance.toSat());
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
    public boolean send(@NonNull WalletEntity walletEntity, @NotNull String target, @NotNull BigInteger amount)
            throws AddressFormatException, InsufficientMoneyException, Wallet.DustySendRequested {
        return sendWithFee(walletEntity, target, amount, BigInteger.ZERO);
    }

    @Override
    public boolean sendWithFee(@NonNull WalletEntity walletEntity, @NotNull String target,
                               @NotNull BigInteger amount, @Nullable BigInteger fee)
            throws AddressFormatException, Wallet.DustySendRequested, InsufficientMoneyException {
        // 546 satoshis is the minimum transaction amount
        if (amount.compareTo(new BigInteger("546")) <= 0) throw new Wallet.DustySendRequested();
        try (val kit = kitFromEntity(walletEntity)) {
            val destination = kit.wallet.parseAddress(target);
            val request = SendRequest.to(destination,
                    Coin.valueOf(amount.longValueExact()));
            request.ensureMinRequiredFee = true;
            if (fee != null && fee.compareTo(BigInteger.ZERO) > 0) {
                if (fee.longValueExact() < rpcClient.minFee()) throw new Wallet.DustySendRequested();
                request.setFeePerVkb(Coin.valueOf(fee.longValueExact()));
            }
            if (!kit.peerGroup.isRunning())
                kit.peerGroup.start();
            kit.wallet.sendCoins(request);
        }
        return true;
    }

    private MemorizerWalletExtension getMemorizerFromWallet(Wallet wallet) {
        return (MemorizerWalletExtension) wallet.getExtensions().get(MemorizerWalletExtension.id());
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
                    val memorizer = getMemorizerFromWallet(wallet);
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
                default -> throw new IllegalArgumentException(STR."Unsupported script type: \{scriptType}");
            }).toString();
        }
    }

    @Override
    public String currentReceiveAddress(@NonNull WalletEntity walletEntity) {
        return currentReceiveAddress(walletEntity, DEFAULT_SCRIPT_TYPE.id());
    }

    @Override
    public String freshReceiveAddress(
            @NonNull WalletEntity walletEntity, String type) throws IllegalArgumentException {
        val scriptType = ScriptType.of(type.toLowerCase());
        try (val kit = kitFromEntity(walletEntity)) {
            val wallet = kit.getWallet();
            val addr = wallet.freshReceiveAddress(scriptType).toString();
            if (scriptType == ScriptType.P2PKH) {
                val memorizer = getMemorizerFromWallet(wallet);
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
    public boolean exportWallet(@NonNull WalletEntity walletEntity, @NonNull OutputStream os) {
        PrintStream out = new PrintStream(os);
        try (val kit = kitFromEntity(walletEntity)) {
            out.println(STR."\{"-".repeat(55)} Your Pecunia Wallet (\{
                    StringUtils.capitalize(getName().toLowerCase())}) Export \{"-".repeat(55)}");
            out.println();
            out.println(STR."Master public key (xPub): \{
                    kit.wallet.getWatchingKey().dropPrivateBytes().dropParent()
                            .serializePubB58(kit.params.network())}");
            out.println();
            if (kit.wallet.getBalance(Wallet.BalanceType.ESTIMATED).toSat() == 0) {
                out.println("You have no addresses with balance.");
                return true;
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
            for (val addr : addresses) {
                val addrPrivate = wal.findKeyFromAddress(wal.parseAddress(addr))
                        .getPrivateKeyEncoded(kit.params.network());
                out.format("%1$-66s %2$-66s %3$s\n", addr, addrPrivate.toString(),
                        Coin.valueOf(balances.get(addr)).toFriendlyString());
            }
        }
        return true;
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
        return Arrays.stream(SUPPORTED_RECEIVE_SCRIPTS).parallel()
                .flatMap(script -> IntStream.range(0, keyCount)
                        .mapToObj(_ -> wallet.freshReceiveAddress(script).toString()))
                .toList();
    }

    private Consumer<WalletKit> getListener(
            WalletEntity entity, WalletKit kit, CountDownLatch latch) {
        return acceptedKit -> {
            if (acceptedKit.entity.equals(entity)) {
                acceptedKit.setEntity(entity);
                kit.setUsers(acceptedKit.users);
                kit.setChain(acceptedKit.chain);
                kit.setStore(acceptedKit.store);
                kit.setPeerGroup(acceptedKit.peerGroup);
                kit.setWallet(acceptedKit.wallet);
                latch.countDown();
            }
        };
    }

    // We can't extract a method from checkInitQueueAndAwait() and checkSyncQueueAndAwait()
    // because synchronized() keyword we need requires final var with global access,
    // not a method param (for the result we want to achieve)

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

    private void initKit(WalletKit kit, WalletEntity entity) {
        // If syncing process it already going, we don't need to
        // duplicate it. Therefore, waiting for sync and get its result.
        try {
            boolean waiting;
            synchronized (currentlyInitializingWallets) {
                waiting = currentlyInitializingWallets.contains(entity.getId());
                if (!waiting) currentlyInitializingWallets.add(entity.getId());
            }
            if (waiting && checkInitQueueAndAwait(kit, entity, Duration.ofMinutes(17))) return;

            val walletName = getWalletFileNameFromEntity(entity);
            log.debug("Start initializing wallet {}", walletName);

            walletRepo.save(entity.withInitializing(true));

            kit.wallet.reset(); // to prevent unexpected behaviors
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
            // Segmentally check address' balances while the last 1/3 part of the segment isn't empty
            // and import existing transactions to the kit
            boolean nonEmptyAddrInEnd; // there is an address with a transaction at the end of the segment
            int scanStartHeight;
            Instant scanStartTime;
            int iteration = 0;
            do {
                iteration++;
                val keyCount = ADDRESS_SYNC_SEGMENT / SUPPORTED_RECEIVE_SCRIPTS.length;
                val addresses = getAddresses(kit.wallet, keyCount);
                Set<String> addressesWithTransaction = new HashSet<>();

                log.debug("Start importing addresses, iteration {}", iteration);
                long startPoint = System.currentTimeMillis();
                rpc.importAddresses(addresses.toArray(new String[0]));
                log.debug("Addresses imported after {}s",
                        ((System.currentTimeMillis() - startPoint) / 1000));
                startPoint = System.currentTimeMillis();
                log.debug("Blockchain rescan started");
                scanStartHeight = rpcClient.getBlock(rpcClient.getBestBlockHash()).height();
                scanStartTime = Instant.now();
                rpc.rescanBlockchain();
                log.debug("Blockchain rescanned after {}s",
                        (System.currentTimeMillis() - startPoint) / 1000);

                rpc.listTransactions().parallelStream().forEach(rawTx -> {
                    // Bitcoin Core wallet could probably contain alien addresses
                    if (addresses.contains(rawTx.address())) {
                        Context.propagate(new Context());
                        log.trace("Found transaction {}", rawTx);
                        addressesWithTransaction.add(rawTx.address());
                        val tx = hexToTx(rawTx.raw().hex());
                        // Bitcoinj trust transaction only if it is self-signed or
                        // peerGroup said that many peers have seen the transaction.
                        // It is taken to BalanceType.AVAILABLE computation only
                        // if at least one peer broadcast it
                        tx.getConfidence().setSource(TransactionConfidence.Source.SELF);
                        tx.getConfidence().markBroadcastBy(PeerAddress.inet(
                                rpcClient.nodeAddr(),
                                Services.of(Services.NODE_NETWORK),
                                Instant.now()));
                        kit.wallet.commitTx(tx);
                    }
                });

                val addressCount = addresses.size();
                nonEmptyAddrInEnd = addresses.subList(addressCount - addressCount / 3, addressCount)
                        .parallelStream()
                        .anyMatch(addressesWithTransaction::contains);
            } while (nonEmptyAddrInEnd);
            kit.wallet.setLastBlockSeenHeight(scanStartHeight);
            kit.wallet.setLastBlockSeenTime(scanStartTime);
            kit.peerGroup.setFastCatchupTime(scanStartTime);

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
        } finally {
            walletRepo.save(entity.withInitializing(false));
            synchronized (currentlyInitializingWallets) {
                currentlyInitializingWallets.remove(entity.getId());
            }
        }
    }

    private void writePeerAndBlockchainToWallet(WalletKit kit, WalletEntity entity) {
        val params = kit.params;
        BlockStore store = null;
        BlockChain chain;
        PeerGroup peerGroup;

        log.debug("Try reading stores from file");
        val storeFile = getStoreFileFromEntity(entity);
        if (storeFile.exists()) {
            try {
                store = new SPVBlockStore(params, storeFile);
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
                } catch (BlockStoreException e1) {
                    try {
                        store = new SPVBlockStore(params, new File(storesDir,
                                STR."tmp-\{RandomStringUtils.randomAlphanumeric(4)}-\{
                                        storeFile.getName()}"));
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
        peerGroup = new MultiThreadPeerGroup(params.network(), chain);
        log.debug("Peer group created");
        // Since we use only our own node, we don't need bloom filters
        // that slow down messaging with the node.
        peerGroup.setBloomFilteringEnabled(false);

        peerGroup.addWallet(kit.wallet);
        chain.addWallet(kit.wallet);

        log.debug("Fulfilling kit for {}", entity.getId());
        kit.setStore(store);
        kit.setChain(chain);
        kit.setPeerGroup(peerGroup);
    }

    private @NonNull WalletKit kitFromEntity(@NonNull WalletEntity walletEntity) {
        log.debug("Requested kit for entity {}", walletEntity.getId());
        Context.propagate(new Context());
        val params = params();

        WalletKit kit = new WalletKit();
        kit.setParams(params);

        if (checkSyncQueueAndAwait(kit, walletEntity, Duration.ofMinutes(5)) ||
                checkInitQueueAndAwait(kit, walletEntity, Duration.ofMinutes(15))) {
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
                wallet = Wallet.loadFromFile(walletFile, new MemorizerWalletExtension());
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
        if (wallet == null) wallet = Wallet.createBasic(params.network());

        if (wallet.getExtensions().get(MemorizerWalletExtension.id()) == null)
            wallet.addExtension(new MemorizerWalletExtension());

        kit = new WalletKit(params, walletEntity, wallet, null, null, null);

        log.debug(STR."Wallet is\{freshWallet ? "" : "n't"} fresh");
        if (!freshWallet || !walletEntity.isExternal()) {
            kit.synchronize();
        } else initKit(kit, walletEntity);

        kit.users.incrementAndGet();
        cachedKits.add(kit);
        wallet.autosaveToFile(walletFile, Duration.ofSeconds(2), null);
        return kit;
    }

    @Data
    @EqualsAndHashCode(of = "entity")
    @NoArgsConstructor
    private class WalletKit implements AutoCloseable {
        NetworkParameters params;
        Wallet wallet;
        BlockStore store;
        BlockChain chain;
        PeerGroup peerGroup;
        WalletEntity entity;

        AtomicInteger users = new AtomicInteger();

        public WalletKit(NetworkParameters params,
                         WalletEntity entity,
                         Wallet wallet,
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

        public void synchronize() {
            try {
                boolean waiting;

                synchronized (currentlySynchronizingWallets) {
                    waiting = currentlySynchronizingWallets.contains(entity.getId());
                    if (!waiting) currentlySynchronizingWallets.add(entity.getId());
                }
                if (waiting) {
                    if (checkSyncQueueAndAwait(this, entity, Duration.ofMinutes(7))) return;
                }

                Context.propagate(new Context());
                if (store == null || chain == null || peerGroup == null)
                    writePeerAndBlockchainToWallet(this, entity);

                val receiveKeysCount = wallet.getIssuedReceiveKeys().size();
                if (receiveKeysCount < 15)
                    wallet.freshKeys(KeyChain.KeyPurpose.RECEIVE_FUNDS, 15 - receiveKeysCount);

                log.debug("Kit is synchronizing at wallet {}", entity.getId());
                val catchUpOptional = wallet.lastBlockSeenTime();

                Instant catchUp = catchUpOptional.orElseGet(() -> {
                    Instant _catchUp = wallet.earliestKeyCreationTime();
                    try {
                        if (_catchUp.equals(Instant.MAX) ||
                                _catchUp.compareTo(Instant.parse("2009-01-01T00:00:00Z")) < 0) { // blockchain was invented at Jan 2009
                            _catchUp = entity.getCreated().toInstant();
                            log.warn("Last seen block and earliest key time are undefined so using entity birthtime: {}", _catchUp);
                        } else
                            log.warn("Wallet last seen block in undefined, so try using earliest key time: {}", _catchUp);
                    } catch (Exception e) {
                        log.error("Catchup defining error", e);
                    }
                    return _catchUp;
                });

                log.info("Start checkpointing");
                try {
                    val checkpoints = bitcoinCheckpointService.getCheckpoints();
                    log.info("Got checkpoints");
                    CheckpointManager.checkpoint(params, checkpoints, store, catchUp);
                } catch (IOException | BlockStoreException e) {
                    log.warn("Failed to load checkpoints before {}", catchUp, e);
                }
                log.info("Caught up at {}", catchUp);
                peerGroup.setFastCatchupTime(catchUp);
                val syncStartTime = Instant.now();
                val pt = new DownloadProgressTracker();
                peerGroup.startBlockChainDownload(pt);
                peerGroup.startAsync();
                pt.await();

                wallet.setLastBlockSeenTime(syncStartTime);
                wallet.saveToFile(getWalletFileFromEntity(entity));

                kitSynchronizedListeners.forEach(_listener -> CompletableFuture.runAsync(() ->
                        _listener.accept(this), listenersExecutor));
            } catch (InterruptedException e) {
                log.error("Kit synchronization interrupted", e);
                synchronize();
            } catch (IOException e) {
                log.warn(STR."Failed to save wallet \{entity.getId()}", e);
            } finally {
                synchronized (currentlySynchronizingWallets) {
                    currentlySynchronizingWallets.remove(entity.getId());
                }
            }
        }

        @Override
        public void close() {
            if (users.decrementAndGet() > 0) return;
            log.info("Closing kit {}", entity.getId());
            try {
                wallet.saveToFile(getWalletFileFromEntity(entity));
                cachedKits.remove(this);
                peerGroup.stop();
                store.close();
            } catch (Exception _) {}
        }
    }
}
