class Cipher {
    static bufToString = buf => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

    static stringToBuf = hexString => {
        const byteLength = hexString.length / 2;
        const bytes = new Uint8Array(byteLength);
        for (let i = 0; i < byteLength; i++) {
            bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
        }
        return bytes.buffer;
    };

    static sha512 = async src => {
        return Cipher.bufToString(
            await crypto.subtle.digest("SHA-512",
                new TextEncoder().encode(src)
            )
        );
    };

    static crypto = async (src, key, device = new DeviceUUID().get()) => {
        key = await Cipher.sha512(key);
        const toKey = async plain => await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(plain),
            {
                name: "PBKDF2"
            },
            false,
            ['deriveBits', 'deriveKey']
        );
        key = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: new TextEncoder().encode(await Cipher.sha512(device)),
                iterations: 48 ** 4,
                hash: "SHA-512",
            },
            await toKey(key),
            {
                name: "AES-CBC",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
        return {
            encrypt: async () => await Cipher.aes256(src, key).encrypt(),
            decrypt: async () => await Cipher.aes256(src, key).decrypt()
        };
    };

    static aes256 = (src, key) => {
        const algorithm = {
            name: "AES-CBC",
            length: 256,
            iv: new TextEncoder().encode("0".repeat(16))
        };

        return {
            encrypt: async () => btoa(Cipher.bufToString(await crypto.subtle
                .encrypt(algorithm, key, new TextEncoder().encode(src)))),
            decrypt: async () => new TextDecoder().decode(await crypto.subtle
                .decrypt(algorithm, key, Cipher.stringToBuf(atob(src))))
        };
    };

}