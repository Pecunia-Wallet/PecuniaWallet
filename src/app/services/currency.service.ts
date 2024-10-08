import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, filter, first, firstValueFrom, map, Observable} from "rxjs";
import {server} from "../app.config";
import BigNumber from "bignumber.js";
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import {AuthService} from "./auth.service";
import {FetchService, minutesDifference} from "./fetch.service";
import {FiatCurrency} from "../models/FiatCurrency";
import {Rate} from "../models/Rate";
import {Coin} from "../models/Coin";
import {Currency} from "../models/Currency";
import {AccountService} from "./account.service";

@Injectable({
    providedIn: "root"
})
export class CurrencyService {

    fiats$ = new BehaviorSubject<Array<FiatCurrency>>([]);
    coins$ = new BehaviorSubject<Array<Coin>>([]);
    rates$ = new BehaviorSubject<Array<Rate>>([]);
    protected lastRatesUpdate: Date;

    constructor(private http: HttpClient,
                private fetcher: FetchService) {
        setInterval(() => this.renewRates(), 1000 * 60 * 2);
        this.renewRates();
    }

    public getFiatCurrencies(): Array<FiatCurrency> {
        return [
            {
                "shortName": "USD",
                "symbol": "$",
                "decimals": 2,
                "fullName": "US Dollar",
                "imageUri": "/images/usa.svg"
            },
            {
                "shortName": "EUR",
                "symbol": "€",
                "decimals": 2,
                "fullName": "Euro",
                "imageUri": "/images/eu.svg"
            },
            {
                "shortName": "JPY",
                "symbol": "¥",
                "decimals": 0,
                "fullName": "Japanese Yen",
                "imageUri": "/images/japan.svg"
            }
        ];
    }

    public getCoins(): Array<Coin> {
        return [
            {
                "shortName": "BTC",
                "fullName": "Bitcoin",
                "decimals": 8,
                "imageUri": "/images/btc.svg",
                "symbol": "₿",
                "color": "#f7931a",
                "defaultAddressType": "wpkh",
                "requiredConfirmations": 3,
                "unitName": "sat",
                "uriPrefix": "bitcoin:",
                "explorer": "https://mempool.space/tx/"
            },
            {
                "shortName": "LTC",
                "fullName": "Litecoin",
                "decimals": 8,
                "imageUri": "/images/ltc.svg",
                "symbol": "Ł",
                "color": "#345d9d",
                "defaultAddressType": "wpkh",
                "requiredConfirmations": 6,
                "unitName": "lit",
                "uriPrefix": "litecoin:",
                "explorer": "https://blockchair.com/litecoin/transaction/"
            },
            {
                "shortName": "DOGE",
                "fullName": "Dogecoin",
                "decimals": 8,
                "imageUri": "/images/doge-simple.svg",
                "symbol": "Ð",
                "color": "#c2a633",
                "defaultAddressType": "pkh",
                "requiredConfirmations": 10,
                "unitName": "koinu",
                "uriPrefix": "dogecoin:",
                "explorer": "https://blockchair.com/dogecoin/transaction/"
            },
            {
                "shortName": "BCH",
                "fullName": "Bitcoin Cash",
                "decimals": 8,
                "imageUri": "/images/bch.svg",
                "symbol": "Ƀ",
                "color": "#0AC18E",
                "defaultAddressType": "pkh",
                "requiredConfirmations": 3,
                "unitName": "sat",
                "uriPrefix": "",
                "explorer": "https://blockchair.com/bitcoin-cash/transaction/"
            }
        ];
    }

    public getCurrencies(): Array<Currency> {
        return [...this.getFiatCurrencies(), ...this.getCoins()];
    }

    public findCurrencyByShortName(shortName?: string): Currency | undefined {
        return this.findByShortName(this.getCurrencies(), shortName);
    }

    public findCoinByShortName(shortName?: string): Coin | undefined {
        return this.findByShortName(this.getCoins(), shortName);
    }

    public findFiatByShortName(shortName?: string): FiatCurrency | undefined {
        return this.findByShortName(this.getFiatCurrencies(), shortName);
    }

    private findByShortName(collection: any[], shortName?: string): any | undefined {
        if (!shortName) return undefined;
        return collection.find(c => c.shortName.toLowerCase() === shortName.toLowerCase());
    }

    public async renewRates() {
        try {
            const coins = this.getCoins();
            const fiats = this.getFiatCurrencies();

            const bRates = await firstValueFrom(
                this.http.get<Array<{
                    coin: string; fiat: string; rate: number
                }>>(`${server}/res/rates`)
            );

            const rates: Rate[] = bRates.map(bRate => {
                const coin = coins.find(c => c.shortName.toUpperCase() == bRate.coin);
                const fiat = fiats.find(f => f.shortName.toUpperCase() == bRate.fiat);
                return new Rate(coin, fiat, new BigNumber(bRate.rate));
            }).filter(rate => !!rate);

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

    private round(value: BigNumber, type: Currency) {
        return value.dp(type.decimals, BigNumber.ROUND_HALF_UP);
    }

    public transfer(amount: BigNumber, from: Currency, to: Currency): Observable<BigNumber> {
        if (!amount || !from || !to) throw new Error("Illegal argument: null.");
        amount = this.round(amount, from);
        return this.getRates().pipe(map(rates => {
            const convertDirect = (amt: BigNumber, rate: BigNumber, isFromFiat: boolean) =>
                isFromFiat ? amt.dividedBy(rate) : amt.multipliedBy(rate);

            const isFromFiat = !("color" in from);
            const directRate = rates.find(rate =>
                rate.fiat.shortName === (isFromFiat ? from : to).shortName &&
                rate.coin.shortName === (isFromFiat ? to : from).shortName
            )?.rate;
            if (directRate) {
                return this.round(convertDirect(amount, directRate, isFromFiat), to);
            }

            const getIntermediaryRate = (currency: Currency, intermediary: string, conversionType: "crypto" | "fiat"): BigNumber | undefined =>
                conversionType === "crypto"
                    ? rates.find(rate => rate.fiat.shortName === intermediary && rate.coin.shortName === currency.shortName)?.rate
                    : rates.find(rate => rate.coin.shortName === intermediary && rate.fiat.shortName === currency.shortName)?.rate;

            const convertViaIntermediary = (
                amt: BigNumber,
                fromCur: Currency,
                toCur: Currency,
                intermediary: string,
                conversionType: "crypto" | "fiat"
            ): BigNumber => {
                const fromRate = getIntermediaryRate(fromCur, intermediary, conversionType);
                const toRate = getIntermediaryRate(toCur, intermediary, conversionType);
                if (!fromRate || !toRate) {
                    throw new Error(`Runtime error: Missing intermediary ${conversionType} rates.`);
                }
                return conversionType === "crypto"
                    ? amt.multipliedBy(fromRate).dividedBy(toRate)
                    : amt.dividedBy(fromRate).multipliedBy(toRate);
            };

            const isFromCrypto = "color" in from;
            const isToCrypto = "color" in to;

            if (isFromCrypto && isToCrypto) {
                return this.round(convertViaIntermediary(amount, from, to, "USD", "crypto"), to);
            } else if (!isFromCrypto && !isToCrypto) {
                return this.round(convertViaIntermediary(amount, from, to, "BTC", "fiat"), to);
            }

            throw new Error("Runtime error: Conversion rate not found.");
        }));
    }

}
