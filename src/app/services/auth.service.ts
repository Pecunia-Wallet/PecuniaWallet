import {forwardRef, Inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, catchError, map, Observable, of, ReplaySubject, Subject, switchMap, take, tap} from "rxjs";
import {CipherService} from "./cipher.service";
import {DeviceUUID} from "device-uuid";
import {CookieService} from "ngx-cookie-service";
import {server, token, tokenCookieName} from "../app.config";
import {Router} from "@angular/router";
import {RouteTrackerService} from "./route-tracker.service";

@Injectable({
    providedIn: "root"
})
export class AuthService {

    private token?: string = token;
    private tokenAuthMap = new Map<string, boolean>();
    private _key: string = "111111";
    private requestedRoute: [string, any] = [undefined as any, undefined];
    public auth$ = new BehaviorSubject(false);

    constructor(private http: HttpClient,
                private cookies: CookieService,
                private cipher: CipherService,
                private router: Router,
                private routeTracker: RouteTrackerService) {
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

    clear() {
        this.token = undefined;
        this._key = undefined as any;
        this.auth$.next(false);
    }

    isAuthorized(internal?: boolean): Observable<boolean> {
        if (!this.token) return new BehaviorSubject(false);
        const auth = this.tokenAuthMap.has(this.token)
            ? of(this.tokenAuthMap.get(this.token)!)
            : this.http.get<boolean>(`${server}/app/check/auth`, {
                withCredentials: true
            });
        const token = this.token;
        return auth.pipe(map(auth => {
            this.tokenAuthMap.set(token, auth);
            if (this.auth$.value != auth) {
                this.auth$.next(auth);
                if (!auth || internal) return auth;

                let lastRouting;
                if (this.requestedRoute[0]) {
                    this.router.navigate([this.requestedRoute[0]], {
                        queryParamsHandling: "merge",
                        queryParams: this.requestedRoute[1]
                    });
                    this.requestedRoute = [undefined as any, undefined];
                } else if ((lastRouting = this.routeTracker.getLast()).route) {
                    if (lastRouting.route.startsWith("unlock")) {
                        this.router.navigate(["/"], { queryParamsHandling: "merge" });
                    }

                    this.router.navigate([lastRouting.route], {
                        queryParamsHandling: "merge",
                        queryParams: lastRouting.queryParams
                    });
                } else {
                    this.router.navigate(["/"], { queryParamsHandling: "merge" });
                }
            }
            return auth;
        }), catchError(e => {
            console.error(e);
            return new BehaviorSubject(false);
        }));
    }

    hasLockPermission(): Observable<boolean> {
        return this.http.get<boolean>(`${server}/app/check/lock`, {
            withCredentials: true
        }).pipe(catchError(() => new BehaviorSubject(false)));
    }

    requestLock(key?: string): Observable<boolean> {
        return this.http.get(`${server}/lock`, {
            withCredentials: true,
            responseType: "text"
        }).pipe(map(token => {
            if (token) {
                this.token = token;
                if (key) this.persistToken(key).subscribe();
                return true;
            } else return false;
        }));
    }

    persistToken(key: string, token?: string): Observable<void> {
        if (!token) token = this.token;

        const now = new Date();
        return this.cipher.encrypt(token || "", key, new DeviceUUID().get())
            .pipe(map(digest => {
                if (digest.endsWith("=="))  // remove base64 '==' ending
                    digest = digest.substring(0, digest.length - 2);
                this.cookies.set(tokenCookieName, digest, {
                    secure: true,
                    sameSite: "Lax",
                    path: "/app",
                    expires: new Date(now.setDate(now.getDate() + 14))
                });
            }));
    }

    checkTokenAndPersist(key: string): Observable<boolean> {
        const token = this.token;
        return this.isAuthorized(true).pipe(map(auth => {
            if (auth) {
                this.persistToken(key, token).subscribe();
                this._key = key;
                return true;
            } else return false;
        }));
    }

    getPersistedToken(): string | undefined {
        const token = this.cookies.get(tokenCookieName);
        if (!token || token.trim().length == 0) return undefined;
        return token + "=="; // add base64 ending
    }

    restoreAuth(key: string): Observable<boolean> {
        const token = this.getPersistedToken();
        if (!token) return new BehaviorSubject(false);
        return this.cipher.decrypt(token, key, new DeviceUUID().get())
            .pipe(switchMap(decrypted => {
                if (decrypted) {
                    this.token = decrypted;
                    return this.isAuthorized().pipe(map(auth => {
                        if (!auth) {
                            this.token = undefined;
                            return false;
                        }
                        else {
                            this._key = key;
                            return true;
                        }
                    }));
                } else return of(false);
            }));
    }

    // getCsrfToken(): string {
    //     return this.cookies.get(csrfCookieName) || "";
    // }

    logout(): void {
        this.cookies.deleteAll();
        window.localStorage.removeItem("walDerRand");
        window.localStorage.removeItem("lastVisitedOfficeQueryParams");
        window.localStorage.removeItem("lastVisitedOfficeRoute");
        window.localStorage.removeItem("lastVisitedQueryParams");
        window.localStorage.removeItem("lastVisitedRoute");
        window.localStorage.removeItem("lastVisitedWalletQueryParams");
        window.localStorage.removeItem("lastVisitedWalletRoute");
        window.location.href = `${server}/logout`;
    }

}
