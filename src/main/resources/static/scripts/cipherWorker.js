importScripts("cipher.js", "https://cdn.jsdelivr.net/npm/device-uuid/lib/device-uuid.min.js");

onmessage = async e => {
    const opt = e.data;
    let res;
    const crypto = await Cipher.crypto(opt.src, opt.key, opt.device);
    if (opt.mode === "encrypt")
        res = crypto.encrypt();
    else if (opt.mode === "decrypt")
        res = crypto.decrypt();
    postMessage(await res);
}