import {Injectable} from "@angular/core";
import {HttpClient, HttpContext} from "@angular/common/http";
import {BehaviorSubject, filter, first, firstValueFrom, map, mergeMap, Observable} from "rxjs";
import {binance, CSRF, server} from "../app.config";
import BigNumber from "bignumber.js";
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import {AuthService} from "./auth.service";
import {FetchService, minutesDifference} from "./fetch.service";
import {FiatCurrency} from "../models/FiatCurrency";
import {Rate} from "../models/Rate";
import {Coin} from "../models/Coin";

@Injectable({
    providedIn: "root"
})
export class CurrencyService {

    fiats$ = new BehaviorSubject<Array<FiatCurrency>>([]);
    coins$ = new BehaviorSubject<Array<Coin>>([]);
    rates$ = new BehaviorSubject<Array<Rate>>([]);
    protected lastRatesUpdate: Date;
    accountCurrency$ = new BehaviorSubject<FiatCurrency>(null as any);
    protected lastAccountCurrencyUpdate: Date;

    constructor(private http: HttpClient,
                private auth: AuthService,
                private fetcher: FetchService) {
        setInterval(() => this.renewRates(), 1000 * 60 * 2);
        this.renewRates();
        this.auth.auth$.pipe(filter(() => !!auth), first()).subscribe(_ => {
            this.getAccountCurrency().subscribe();
        });
    }

    public getFiatCurrencies(): Observable<Array<FiatCurrency>> {
        return this.fetcher.fetch({
            subject: this.fiats$,
            when: v => v.length == 0,
            renew: {
                url: `${server}/res/fiat`
            }
        });
    }

    public getCoins(): Observable<Array<Coin>> {
        return this.fetcher.fetch({
            subject: this.coins$,
            when: v => v.length == 0,
            renew: {
                url: `${server}/res/coins`
            }
        });
    }

    public async renewRates() {
        try {
            const [coins, fiats] = await Promise.all([
                firstValueFrom(this.getCoins()),
                firstValueFrom(this.getFiatCurrencies())
            ]);

            const bRates = await firstValueFrom(
                this.http.get<Array<{
                    coin: string; fiat: string; rate: number
                }>>(`${server}/res/rates`)
            );

            // @ts-ignore as soon as we filter results
            const rates: Rate[] = bRates.map(bRate => {
                const coin = coins.find(c => c.shortName.toUpperCase() == bRate.coin);
                const fiat = fiats.find(f => f.shortName.toUpperCase() == bRate.fiat);
                return new Rate(coin, fiat, new BigNumber(bRate.rate));
            }).filter(rate => !!rate);

            console.log(rates)
            this.rates$.next(rates);
            this.lastRatesUpdate = new Date();
        } catch (error) {
            console.error("Failed to renew rates", error);
        }
    }

    public getRates(): Observable<Array<Rate>> {
        return this.fetcher.fetch({
            subject: this.rates$,
            when: v => v.length == 0 ||
                minutesDifference(this.lastRatesUpdate, new Date()) > 3,
            renew: () => fromPromise(this.renewRates())
                .pipe(map(() => this.rates$.value))
        })
    }

    private round(value: BigNumber, type: FiatCurrency | Coin) {
        return value.dp(type.decimals, BigNumber.ROUND_HALF_UP);
    }

    public transfer(amount: BigNumber, from: FiatCurrency | Coin, to: Coin | FiatCurrency): Observable<BigNumber> {
        if (!amount || !from || !to) throw new Error("Illegal argument: null.");
        amount = this.round(amount, from);
        return this.getRates().pipe(map(rates => {
            const fromFiat = "symbol" in from;
            let rate = rates.find(rate =>
                rate.fiat.shortName == (fromFiat ? from : to).shortName &&
                rate.coin.shortName == (fromFiat ? to : from).shortName
            )?.rate;
            if (!rate) throw new Error("Runtime error.");
            return this.round(fromFiat ? amount.dividedBy(rate) : amount.multipliedBy(rate), to);
        }));
    }

    public getAccountCurrency(): Observable<FiatCurrency> {
        return this.fetcher.fetch({
            subject: this.accountCurrency$,
            when: () => minutesDifference(this.lastAccountCurrencyUpdate, new Date()) > 1,
            parse: name => this.getFiatCurrencies().pipe(map(fiats => {
                const currency = fiats.find(f => f.shortName == name);
                this.lastAccountCurrencyUpdate = new Date()
                return currency || fiats[0];
            })),
            renew: {
                url: `${server}/account/currency`,
                sendCredentials: true,
                raw: true
            }
        })
    }

    public setAccountCurrency(currency: FiatCurrency): Observable<void> {
        this.accountCurrency$.next(currency);
        return this.http.post(`${server}/account/currency`, currency.shortName, {
            withCredentials: true
        }).pipe(map(() => {
        }));
    }

}
