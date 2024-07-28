package com.pecuniawallet.crypto.bitcoin;

import lombok.Getter;
import lombok.val;
import org.bitcoinj.base.Network;
import org.bitcoinj.core.TransactionOutput;
import org.bitcoinj.wallet.CoinSelection;
import org.bitcoinj.wallet.DefaultCoinSelector;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
class MemorizingCoinSelector extends DefaultCoinSelector {

    CoinSelection selection;

    public Set<String> getSelectedAddresses(Network net) {
        return selection.outputs().parallelStream()
                .map(out -> out.getScriptPubKey().getToAddress(net).toString())
                .collect(Collectors.toSet());
    }

    public Map<String, Long> getBalancePerAddress(Network net) {
        return selection.outputs().parallelStream()
                .collect(Collectors.toMap(
                        out -> out.getScriptPubKey().getToAddress(net).toString(),
                        out -> out.getValue().toSat(),
                        Long::sum));
    }

    @Override
    public CoinSelection select(org.bitcoinj.base.Coin target, List<TransactionOutput> candidates) {
        selection = super.select(target, candidates);
        return selection;
    }

}