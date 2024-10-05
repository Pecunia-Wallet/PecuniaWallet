import {Injectable} from "@angular/core";
import {CipherResponse, CipherSettings} from "../workers/cipher.worker";
import {filter, map, Observable, Subject, take} from "rxjs";

@Injectable({
    providedIn: "root"
})
export class CipherService {

    worker: Worker;
    workerResponse$: Subject<CipherResponse> = new Subject();

    constructor() {
        this.worker = new Worker(new URL("../workers/cipher.worker", import.meta.url));
        this.worker.onmessage = msg => this.workerResponse$.next(msg.data as CipherResponse);

    }

    private exchange(src: string,
                     key: string,
                     task: "encrypt" | "decrypt",
                     salt?: string): Observable<string> {
        const ray = crypto.randomUUID();
        const opt: CipherSettings = {
            src: src,
            key: key,
            salt: salt,
            id: ray,
            task: task
        };
        const observable = this.workerResponse$.pipe(
            map(response => {
                if (response.error) console.error(response.error);
                return response;
            }),
            filter(response => response.id == ray),
            map(response => response.message || null),
            take(1)
        );
        this.worker.postMessage(opt);
        return observable as unknown as Observable<string>;
    }

    encrypt(src: string, key: string, salt?: string) {
        return this.exchange(src, key, "encrypt", salt);
    }

    decrypt(src: string, key: string, salt?: string) {
        return this.exchange(src, key, "decrypt", salt);
    }

}
