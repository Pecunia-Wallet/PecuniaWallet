import {Injectable} from "@angular/core";
import {BehaviorSubject, filter, finalize, first, map, Observable, of, shareReplay, tap} from "rxjs";
import {FiatCurrency} from "../models/FiatCurrency";
import {FetchService, minutesDifference} from "./fetch.service";
import {server} from "../app.config";
import {HttpClient} from "@angular/common/http";
import {AuthService} from "./auth.service";
import {CurrencyService} from "./currency.service";

@Injectable({
    providedIn: "root"
})
export class AccountService {

    accountCurrency$ = new BehaviorSubject<FiatCurrency>(null as any);
    protected lastAccountCurrencyUpdate: Date;

    private _shouldShowMerchantHint: boolean | null = null;
    private _shouldShowMerchantHint$?: Observable<boolean>;

    public constructor(private http: HttpClient,
                       private currencies: CurrencyService,
                       private fetcher: FetchService,
                       private auth: AuthService) {
        this.auth.auth$.pipe(filter(auth => auth), first()).subscribe(_ => {
            this.getAccountCurrency().subscribe();
        });
    }

    public getAccountCurrency(): Observable<FiatCurrency> {
        return this.fetcher.fetch({
            subject: this.accountCurrency$,
            when: () => minutesDifference(this.lastAccountCurrencyUpdate, new Date()) > 5,
            parse: name => {
                const fiats = this.currencies.getFiatCurrencies();
                const currency = fiats.find(f => f.shortName == name);
                this.lastAccountCurrencyUpdate = new Date()
                return currency || fiats[0];
            },
            renew: {
                url: `${server}/account/currency`,
                sendCredentials: true,
                raw: true,
                retry: 3
            }
        })
    }

    public setAccountCurrency(currency: FiatCurrency): Observable<void> {
        this.accountCurrency$.next(currency);
        return this.http.post(`${server}/account/currency`, currency.shortName, {
            withCredentials: true
        }).pipe(map(() => {}));
    }

    public shouldShowMerchantHint(): Observable<boolean> {
        if (this._shouldShowMerchantHint !== null) {
            return of(this._shouldShowMerchantHint);
        }

        if (this._shouldShowMerchantHint$) {
            return this._shouldShowMerchantHint$;
        }

        this._shouldShowMerchantHint$ = this.http.get(
            `${server}/account/merchant-hint`,
            {
                withCredentials: true,
                responseType: 'text'
            }
        ).pipe(
            map(res => res === 'true'),
            tap(value => this._shouldShowMerchantHint = value),
            finalize(() => this._shouldShowMerchantHint$ = undefined),
            shareReplay(1)
        );

        return this._shouldShowMerchantHint$;
    }

    public closeMerchantHint(): void {
        if (this._shouldShowMerchantHint == false) return;
        this._shouldShowMerchantHint = false;
        this.http.post(`${server}/account/close-merchant-hint`, {}, {
            withCredentials: true
        }).subscribe();
    }

}