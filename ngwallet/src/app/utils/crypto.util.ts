export interface CryptoInstance {

    encrypt(): Promise<string>;

    decrypt(): Promise<string>;

}

export function bufToString(buf: ArrayBuffer): string {
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function stringToBuf(hexString: string): ArrayBuffer {
    const byteLength = hexString.length / 2;
    const bytes = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
        const byteStart = i * 2;
        bytes[i] = parseInt(hexString.substring(byteStart, byteStart + 2), 16);
    }
    return bytes.buffer;
}

export async function sha512(src: string): Promise<string> {
    return bufToString(
        await crypto.subtle.digest("SHA-512",
            new TextEncoder().encode(src)
        )
    );
}

export async function getCryptoInstance(src: string, plainKey: string,
                                        salt: string = ""): Promise<CryptoInstance> {
    plainKey = await sha512(plainKey);
    const stringToKey = async (plain: string): Promise<CryptoKey> =>
        await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(plain),
            {
                name: "PBKDF2"
            },
            false,
            ['deriveBits', 'deriveKey']
        );
    const cryptoKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: new TextEncoder().encode(await sha512(salt)),
            iterations: 48 ** 4,
            hash: "SHA-512",
        },
        await stringToKey(plainKey),
        {
            name: "AES-CBC",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );
    return {
        encrypt: async () => await aes256(src, cryptoKey).encrypt(),
        decrypt: async () => await aes256(src, cryptoKey).decrypt()
    };
}

export function aes256(src: string, key: CryptoKey): CryptoInstance {
    const algorithm = {
        name: "AES-CBC",
        length: 256,
        iv: new TextEncoder().encode("0".repeat(16))
    };

    return {
        encrypt: async () => btoa(bufToString(await crypto.subtle
            .encrypt(algorithm, key, new TextEncoder().encode(src)))),
        decrypt: async () => new TextDecoder().decode(await crypto.subtle
            .decrypt(algorithm, key, stringToBuf(atob(src))))
    };
}
