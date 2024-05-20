package com.pecuniawallet.crypto.bitcoin;

import lombok.val;
import org.bitcoinj.base.Address;
import org.bitcoinj.wallet.Wallet;
import org.bitcoinj.wallet.WalletExtension;

import java.io.*;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentSkipListSet;

public class MemorizerWalletExtension implements WalletExtension {
    private Set<String> memorizedAddresses = new ConcurrentSkipListSet<>();

    public Set<String> getMemorizedAddresses() {
        return new HashSet<>(memorizedAddresses);
    }

    public boolean known(String addr) {
        return memorizedAddresses.contains(addr);
    }

    public boolean unknown(String addr) {
        return !known(addr);
    }

    public void memorize(String addr) {
        memorizedAddresses.add(addr);
    }

    public void forget(String addr) {
        memorizedAddresses.remove(addr);
    }

    public static String id() {
        return "freshAddressesMemorizer";
    }

    @Override
    public String getWalletExtensionID() {
        return id();
    }

    @Override
    public boolean isWalletExtensionMandatory() {
        return true;
    }

    @Override
    public byte[] serializeWalletExtension() {
        val baos = new ByteArrayOutputStream();
        val bos = new BufferedOutputStream(baos);
        try (val oos = new ObjectOutputStream(bos)) {
            oos.writeObject(memorizedAddresses);
            oos.flush();
            return baos.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public void deserializeWalletExtension(Wallet _wallet, byte[] data) {
        val bais = new ByteArrayInputStream(data);
        val bis = new BufferedInputStream(bais);
        try (val ois = new ObjectInputStream(bis)) {
            memorizedAddresses = (Set<String>) ois.readObject();
        } catch (Exception _) {}
        _wallet.addCoinsReceivedEventListener((_, tx, _, _) -> tx.getOutputs().forEach(out ->
                forget(out.getScriptPubKey().getToAddress(_wallet.network()).toString())));
    }
}