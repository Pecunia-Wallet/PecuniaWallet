package com.pecuniawallet.crypto.bitcoin;

import com.google.common.util.concurrent.Uninterruptibles;
import jakarta.annotation.Nullable;
import lombok.val;
import org.bitcoinj.base.Network;
import org.bitcoinj.core.AbstractBlockChain;
import org.bitcoinj.core.NetworkParameters;
import org.bitcoinj.core.PeerGroup;
import org.bitcoinj.net.ClientConnectionManager;
import org.bitcoinj.net.NioClientManager;
import org.bitcoinj.utils.ContextPropagatingThreadFactory;

import java.util.concurrent.*;

public class MultiThreadPeerGroup extends PeerGroup {

    public MultiThreadPeerGroup(Network network, @Nullable AbstractBlockChain chain) {
        super(network, chain, new NioClientManager() {
            final ExecutorService executorService = Executors.newFixedThreadPool(4);

            @Override
            protected Executor executor() {
                return executorService;
            }
        });
    }

    private final CountDownLatch executorStartupLatch = new CountDownLatch(1);

    @Override
    protected ScheduledExecutorService createPrivateExecutor() {
        val threadCount = 4;
        ScheduledExecutorService result =
                new ScheduledThreadPoolExecutor(threadCount, new ContextPropagatingThreadFactory("btcPeerGrThread"));
        for (int i = 0; i < threadCount; i++)
            result.execute(() -> Uninterruptibles.awaitUninterruptibly(executorStartupLatch));
        return result;
    }
}
