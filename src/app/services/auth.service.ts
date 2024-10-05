import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, catchError, map, Observable, of, ReplaySubject, Subject} from "rxjs";
import {CipherService} from "./cipher.service";
import {DeviceUUID} from "device-uuid";
import {CookieService} from "ngx-cookie-service";
import {csrfCookieName, server, token, tokenCookieName} from "../app.config";
import {Router} from "@angular/router";

@Injectable({
    providedIn: "root"
})
export class AuthService {

    private token?: string = token;
    private _key: string;
    private requestedRoute: [string, any] = ["/", undefined];
    public auth$ = new BehaviorSubject(false);
    public authenticatedTokensCache: string[] = [];

    constructor(private http: HttpClient,
                private cookies: CookieService,
                private cipher: CipherService,
                private router: Router) {
        if (this.token) {
            this.auth$.next(true);
        }
    }

    get key(): string {
        return this._key;
    }

    navigateAfterAuth(route: string, params: any) {
        this.requestedRoute = [route, params];
    }

    getToken(): string | undefined {
        return this.token;
    }

    isAuthorized(internal?: boolean): Observable<boolean> {
        if (!this.token) return new BehaviorSubject(false);
        if (this.authenticatedTokensCache.includes(this.token)) return of(true);
        return this.http.get<boolean>(`${server}/check/auth`, {
            withCredentials: true
        }).pipe(map(auth => {
            if (auth) this.authenticatedTokensCache.push(this.token!);
            if (this.auth$.value != auth) {
                this.auth$.next(auth);
                if (auth) {
                    if (this.requestedRoute[0] && !internal) {
                        this.router.navigate([this.requestedRoute[0]], {
                            queryParamsHandling: "preserve",
                            queryParams: this.requestedRoute[1]
                        });
                        this.requestedRoute = ["/", undefined];
                    }
                }
            }
            return auth;
        }), catchError(() => new BehaviorSubject(false)));
    }

    hasLockPermission(): Observable<boolean> {
        return this.http.get<boolean>(`${server}/check/lock`, {
            withCredentials: true
        }).pipe(catchError(() => new BehaviorSubject(false)));
    }

    requestLock(key?: string): Observable<boolean> {
        const res = new Subject<boolean>();
        this.http.get(`${server}/lock`, {
            withCredentials: true,
            responseType: "text"
        }).subscribe(token => {
            if (token) {
                this.token = token;
                if (key) this.persistToken(key).subscribe(() => res.next(true));
                else res.next(true);
            } else res.next(false);
        });
        return res;
    }

    persistToken(key: string, token?: string): Observable<void> {
        if (!token) token = this.token;

        const now = new Date();
        const res = new Subject<void>();
        this.cipher.encrypt(token || "", key, new DeviceUUID().get())
            .subscribe(digest => {
                if (digest.endsWith("=="))  // remove base64 '==' ending
                    digest = digest.substring(0, digest.length - 2);
                this.cookies.set(tokenCookieName, digest, {
                    secure: true,
                    sameSite: "Lax",
                    path: "/",
                    expires: new Date(now.setDate(now.getDate() + 14))
                });
                res.next();
            });
        return res;
    }

    checkTokenAndPersist(key: string): Observable<boolean> {
        const token = this.token;
        const res = new ReplaySubject<boolean>();
        this.isAuthorized(true).subscribe(auth => {
            if (auth) {
                this.persistToken(key, token).subscribe(() => res.next(true));
                this._key = key;
            } else res.next(false);
        });
        return res;
    }

    getPersistedToken(): string | undefined {
        const token = this.cookies.get(tokenCookieName);
        if (!token || token.trim().length == 0) return undefined;
        return token + "=="; // add base64 ending
    }

    restoreAuth(key: string): Observable<boolean> {
        const token = this.getPersistedToken();
        if (!token) return new BehaviorSubject(false);
        const res = new ReplaySubject<boolean>();
        this.cipher.decrypt(token, key, new DeviceUUID().get())
            .subscribe(decrypted => {
                if (decrypted) {
                    this.token = decrypted;
                    this.isAuthorized().subscribe(auth => {
                        if (!auth) this.token = undefined;
                        else this._key = key;
                        res.next(auth);
                    });
                } else res.next(false);
            });
        return res;
    }

    getCsrfToken(): string {
        return this.cookies.get(csrfCookieName) || "";
    }

}
