import {Injectable} from "@angular/core";
import {BehaviorSubject, map, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {server} from "../app.config";
import {AuthService} from "./auth.service";
import {webSocket} from "rxjs/webSocket";
import {Router} from "@angular/router";
import {NotifyService} from "./notify.service";
import {DomSanitizer} from "@angular/platform-browser";
import {faCircleCheck} from "@fortawesome/free-solid-svg-icons";
import {HotToastService} from "@ngxpert/hot-toast";
import {WindowComponent} from "../components/window/window.component";
import {CurrencyService} from "./currency.service";
import {WalletService} from "./wallet.service";

@Injectable({
    providedIn: "root"
})
export class SyncService {

    sync$ = new BehaviorSubject<boolean | undefined>(undefined);

    constructor(wallet: WalletService,
                private http: HttpClient,
                private auth: AuthService,
                private router: Router,
                private toast: HotToastService) {
        this.auth.auth$.subscribe(auth => {
            if (!auth) return;
            this.renewSync().subscribe(sync => {
                if (!sync) {
                    return void wallet.enableSync();
                }

                const ws = webSocket(`${server}/ws/wallet/sync`
                    .replace("https", "wss")
                    .replace("http", "ws"));

                const getPingInterval = (() => {
                    let intervalId: number | null = null;

                    return (): number => {
                        if (intervalId === null) {
                            intervalId = window.setInterval(
                                () => ws.next({ping: "pong"}),
                                1000 * 60
                            );
                        }
                        return intervalId;
                    };
                })();

                ws.subscribe(msg => {
                    const sync = msg == "true";
                    this.sync$.next(sync);
                    if (!sync) {
                        this.router.navigate(["/"], {
                            queryParamsHandling: "preserve"
                        }).then(() => this.toast.success(`
                            <span class="sync">
                                Your <span class="sync-logo-group">
                                <img class="sync-logo" src="${server}/images/favicon.png" width="18" height="18">
                                <span class="sync-title">Wallet</span></span> is ready!
                            </span>    
                        `, {
                            id: "walletSynced",
                            autoClose: false
                        }));

                        ws.complete();
                        clearInterval(getPingInterval());
                        wallet.enableSync();
                    }
                });
                ws.next({
                    token: this.auth.getToken()
                });
            });
        });
    }

    renewSync(): Observable<boolean> {
        return this.http.get(`${server}/signature/any/sync`, {
            withCredentials: true,
            responseType: "text"
        }).pipe(map(sync => {
            this.sync$.next(sync == "true")
            return sync == "true";
        }));
    }

}
