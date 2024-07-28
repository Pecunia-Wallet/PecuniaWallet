/// <reference lib="webworker" />

import {getCryptoInstance} from "../utils/crypto.util";

export interface CipherSettings {
    src: string;
    key: string;
    salt?: string;
    id?: any;
    task: "decrypt" | "encrypt";
}

export interface CipherResponse {
    error?: string;
    message?: string;
    id?: any;
}

addEventListener("message", async (ev: MessageEvent<CipherSettings>) => {
    const opt = ev.data;
    let response: CipherResponse = {
        message: undefined,
    };
    try {
        const crypto = await getCryptoInstance(opt.src, opt.key, opt.salt);
        switch (opt.task) {
            case "decrypt":
                response.message = await crypto.decrypt();
                break;
            case "encrypt":
                response.message = await crypto.encrypt();
        }
    } catch (e: any) {
        const err = e as Error;
        const specMessage = opt.task == "decrypt"
            ? "Consider checking the key and/or the source." : "";
        response.error = `Failed to ${opt.task} with root cause: {${err.name}: ${err.message}}. ${specMessage}`;
    }

    if (opt.id) response.id = opt.id;
    postMessage(response);
});
