import {Injectable, TemplateRef} from "@angular/core";
import {BehaviorSubject, map, Observable} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {server} from "../app.config";
import {AuthService} from "./auth.service";
import {webSocket} from "rxjs/webSocket";
import {Router} from "@angular/router";
import {NotifyService} from "./notify.service";
import {DomSanitizer} from "@angular/platform-browser";
import {faCircleCheck} from "@fortawesome/free-solid-svg-icons";

@Injectable({
    providedIn: "root"
})
export class SyncService {

    sync$ = new BehaviorSubject<boolean | undefined>(undefined);

    constructor(private http: HttpClient,
                private auth: AuthService,
                private router: Router,
                private sanitizer: DomSanitizer,
                private notify: NotifyService) {
        this.auth.auth$.subscribe(auth => {
            if (!auth) return;
            this.renewSync().subscribe(sync => {
                if (sync) {
                    const ws = webSocket(`${server}/ws/wallet/sync`
                        .replace("https", "wss")
                        .replace("http", "ws"));
                    ws.subscribe(msg => {
                        const sync = msg == "true";
                        this.sync$.next(sync);
                        if (!sync) {
                            this.router.navigate(["/"], {
                                queryParamsHandling: "preserve"
                            }).then(() => this.notify.notification$.next({
                                title: "Synchronized!",
                                text: this.sanitizer.bypassSecurityTrustHtml(`
                                    Your <img src="${server}/images/favicon.png" width="20" height="20" alt="❤">
                                    Pecunia is ready`),
                                icon: faCircleCheck
                            }));
                            ws.complete();
                        }
                    });
                    ws.next({
                        token: this.auth.getToken()
                    });
                    setInterval(() => ws.next({ping: "pong"}), 1000 * 60);
                }
            });
        });
    }

    renewSync(): Observable<boolean> {
        return this.http.get(`${server}/wallet/any/sync`, {
            withCredentials: true,
            responseType: "text"
        }).pipe(map(sync => {
            this.sync$.next(sync == "true")
            return sync == "true";
        }));
    }

}
