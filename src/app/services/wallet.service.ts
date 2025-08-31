import {forwardRef, Inject, Injectable, Injector} from "@angular/core";
import {HttpBackend, HttpClient} from "@angular/common/http";
import {server} from "../app.config";
import {CurrencyService} from "./currency.service";
import {catchError, Observable, of, skip, tap} from "rxjs";
import BigNumber from "bignumber.js";
import {FetchService} from "./fetch.service";
import {ActivatedRoute} from "@angular/router";
import {Transaction} from "../models/Transaction";
import {Coin} from "../models/Coin";
import {CoinInfo} from "../models/CoinInfo";
import {AuthService} from "./auth.service";
import {AddressBag, Balance, Wallet, WalletExport} from "wallet-sensitive/dist";
import {CookieService} from "ngx-cookie-service";

export interface FeeEstimate {
    blocks: number;
    feeRate: BigNumber;
}

export interface TransactionOutputs {
    [address: string]: BigNumber;
}

export interface SendResponse {
    code: 0 | -100 | -125 | -175 | -300 | -400 | -1 | -2;
    txId?: string;
}

@Injectable({
    providedIn: "root"
})
export class WalletService {

    private wallet: Wallet;

    private syncEnabled: boolean;

    private currencyService: CurrencyService;

    constructor(private fetcher: FetchService,
                private http: HttpClient,
                private auth: AuthService,
                private cookie: CookieService,
                private injector: Injector) {
        this.wallet = new Wallet(fetcher, http, auth, cookie as any, server);
        setTimeout(() => {
            this.currencyService = injector.get(CurrencyService);
            this.wallet.injectCurrencyService(this.currencyService);
        }, 10);
        // if (auth.auth$.value) this.wallet.readApiToken();
        // auth.auth$.subscribe(auth => {
        //     if (auth) this.wallet.readApiToken();
        // });
    }

    enableSync() {
        if (this.syncEnabled) return;
        this.currencyService.getCoins().forEach(coin => setInterval(() => {
            this.getBalance(coin, true).subscribe();
        }, 1000 * 30));
        this.syncEnabled = true;
    }

    getApiToken(): Observable<string> {
        return this.wallet.getApiToken();
    }

    getCoinInfo(coin: Coin): CoinInfo {
        return this.wallet.getCoinInfo(coin);
    }

    getAddresses(coin: Coin): Observable<AddressBag> {
        return this.wallet.getAddresses(coin);
    }

    export(coin: Coin): Observable<WalletExport> {
        return this.wallet.export(coin);
    }

    getBalance(coin: Coin, force?: boolean): Observable<Balance> {
        return this.wallet.getBalance(coin, force);
    }

    onBalanceChange(coin: Coin): Observable<Balance> {
        return this.wallet.onBalanceChange(coin).pipe(skip(1), tap(() => {
            this.wallet.clearTransactionCache(coin)
        }));
    }

    getTransactions(coin: Coin,
                    page?: { size: number, offset: number },
                    orderBy: "AMOUNT" | "TIME" | "TYPE" = "TIME",
                    orderDir: "ASC" | "DESC" = "DESC"): Observable<[number, Array<Transaction>]> {
        return this.wallet.getTransactions(coin, page, orderBy, orderDir);
    }

    getTransaction(coin: Coin, id: string): Observable<Transaction> {
        return this.wallet.getTransaction(coin, id);
    }

    verifyKeys(coin: Coin, keys: string[]): Observable<boolean> {
        return this.wallet.verifyKeys(coin, keys);
    }

    importKeys(coin: Coin, fee: BigNumber, keys: string[]): Observable<SendResponse> {
        return this.wallet.importKeys(coin, fee, keys).pipe(tap(() => this.wallet.clearTransactionCache(coin)));
    }

    currentCoin(route: ActivatedRoute) {
        return this.wallet.currentCoin(route);
    }

    getFeeEstimates(coin: Coin): Observable<Array<FeeEstimate>> {
        return this.wallet.getFeeEstimates(coin);
    }

    grantKeys(): Observable<boolean> {
        return this.wallet.grantKeys();
    }

    revokeKeys() {
        return this.http.delete(`${server}/account/keys`, {
            withCredentials: true,
            responseType: "text"
        }).pipe(catchError(e => {
            return of(null);
        }));
    }

    send(coin: Coin,
         outputs: TransactionOutputs,
         fee?: BigNumber,
         recipientsPayFees?: boolean): Observable<SendResponse> {
        return this.wallet.send(coin, outputs, fee, recipientsPayFees)
            .pipe(tap(() => this.wallet.clearTransactionCache(coin)));
    }
}
