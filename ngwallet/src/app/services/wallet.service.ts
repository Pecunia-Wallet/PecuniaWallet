import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {server} from "../app.config";
import {CurrencyService} from "./currency.service";
import {BehaviorSubject, filter, first, map, Observable, of, take, tap} from "rxjs";
import BigNumber from "bignumber.js";
import {FetchService, minutesDifference} from "./fetch.service";
import {ActivatedRoute} from "@angular/router";
import {Transaction} from "../models/Transaction";
import {Coin} from "../models/Coin";
import {CoinInfo} from "../models/CoinInfo";
import {AuthService} from "./auth.service";

interface ParametrizedFetch<T> {
    coin: Coin;
    subject: BehaviorSubject<T>;
    lastUpdated: Date;
    previousValue: BigNumber | null;
}

export interface FeeEstimate {
    blocks: number;
    feeRate: BigNumber;
}

export interface TransactionOutputs {
    [address: string]: BigNumber;
}

export interface SendResponse {
    code: 0 | -100 | -125 | -175 | -300 | -400;
    txId?: string;
}

@Injectable({
    providedIn: "root"
})
export class WalletService {

    transactionCache = new Map<string, Transaction>();

    constructor(private fetcher: FetchService,
                private http: HttpClient,
                private currencyService: CurrencyService,
                private auth: AuthService) {
        this.auth.auth$.pipe(filter(() => !!auth), first()).subscribe(_ => {
            this.currencyService.getCoins()
                .subscribe(coins => {
                    coins.forEach(coin => setInterval(() => {
                        this.getBalance(coin, true).subscribe();
                    }, 1000 * 45));
                })
        })
    }

    private balances: Array<ParametrizedFetch<BigNumber>> = [];
    private transactions: Array<ParametrizedFetch<Transaction>> = [];
    private coinInfos: Array<ParametrizedFetch<CoinInfo>> = [];

    private getWrapper(coin: Coin, target: ParametrizedFetch<any>[]) {
        let wrapper = target.find(f => f.coin == coin);
        if (!wrapper) target.push(wrapper = {
            coin: coin,
            subject: new BehaviorSubject<BigNumber>(new BigNumber("")),
            lastUpdated: new Date(0),
            previousValue: null
        });
        return wrapper;
    }

    getCoinInfo(coin: Coin): Observable<CoinInfo> {
        const wrapper = this.getWrapper(coin, this.coinInfos);
        return this.fetcher.fetch({
            subject: wrapper.subject,
            parse: (coinInfo: CoinInfo | string) => coinInfo as CoinInfo,
            renew: {
                url: `${server}/wallet/${coin.shortName}/info`,
                sendCredentials: true
            }
        });
    }

    getAddress(coin: Coin, type?: string): Observable<string> {
        return this.http.get(`${server}/wallet/${coin.shortName}/addr`, {
            withCredentials: true,
            responseType: "text",
            params: {
                type: type || "default"
            }
        });
    }

    getBalance(coin: Coin, force?: boolean): Observable<BigNumber> {
        const wrapper = this.getWrapper(coin, this.balances);
        return this.fetcher.fetch({
            subject: wrapper.subject,
            when: () => force || minutesDifference(wrapper.lastUpdated, new Date()) > 2,
            parse: (balance: string) => {
                wrapper.lastUpdated = new Date();
                wrapper.previousValue = wrapper.subject.value;
                return new BigNumber(balance);
            },
            renew: {
                url: `${server}/wallet/${coin.shortName}/balance`,
                sendCredentials: true
            }
        });
    }

    onBalanceChange(coin: Coin): Observable<BigNumber> {
        const wrapper = this.getWrapper(coin, this.balances);
        return wrapper.subject.pipe(filter((value: BigNumber) =>
            !value.isEqualTo(wrapper.previousValue || new BigNumber("-1"))
        ));
    }

    private convertObjToTx(tx: Transaction): Transaction {
        if (!tx) return null as any;
        tx.amount = new BigNumber(tx.amount);
        tx.fee = new BigNumber(tx.fee);
        tx.time = new Date(tx.time);
        return tx;
    }

    getTransactions(coin: Coin,
                    page?: { size: number, offset: number },
                    orderBy: "AMOUNT" | "TIME" | "TYPE" = "TIME",
                    orderDir: "ASC" | "DESC" = "DESC"): Observable<[number, Array<Transaction>]> {
        const wrapper = this.getWrapper(coin, this.transactions);
        return this.http.get<Array<Transaction>>(`${server}/wallet/${coin.shortName}/txs`, {
            withCredentials: true,
            params: {
                orderBy: orderBy,
                orderDir: orderDir,
                pageSize: page?.size || -1,
                pageOffset: page?.offset || 0,
            },
            observe: "response"
        }).pipe(map(response => {
            const itemsRemaining = Number.parseInt(
                response.headers.get("X-Items-Remaining") || "0");
            const transactions = response.body?.map(this.convertObjToTx) || [];
            wrapper.lastUpdated = new Date();
            return [itemsRemaining, transactions];
        }));
    }

    getTransaction(coin: Coin, id: string): Observable<Transaction> {
        if (this.transactionCache.has(id)) return of(this.transactionCache.get(id)!!);
        return this.http.get<Transaction>(`${server}/wallet/${coin.shortName}/tx/${id}`, {
            withCredentials: true
        }).pipe(map(this.convertObjToTx), tap(tx =>
            this.transactionCache.set(id, tx)
        ));
    }

    importKeys(coin: Coin, keys: string[]): Observable<boolean> {
        return this.http.post(`${server}/wallet/${coin.shortName}/import`, keys, {
            withCredentials: true,
            responseType: "text"
        }).pipe(map(response => response.toLowerCase() == "true"));
    }

    currentCoin(route: ActivatedRoute) {
        const n = route.snapshot.queryParamMap.get("n");
        return this.currencyService.getCoins().pipe(map(coins => {
            const coin = coins.find(coin => coin.shortName.toLowerCase() == n?.toLowerCase());
            if (!coin) return undefined;
            return coin;
        }));
    }

    getFeeEstimates(coin: Coin): Observable<Array<FeeEstimate>> {
        return this.http.get(`${server}/wallet/${coin.shortName}/fees`, {
            withCredentials: true
        }).pipe(map((estimates: any) => {
            let res = [];
            for (const [block, rate] of Object.entries(estimates)) {
                res.push({
                    blocks: parseInt(block),
                    feeRate: new BigNumber(rate as string)
                });
            }
            return res;
        }));
    }

    send(coin: Coin,
         outputs: TransactionOutputs,
         fee?: BigNumber,
         recipientsPayFees?: boolean): Observable<SendResponse> {
        const transactionRequest: any = {
            outputs: outputs
        };
        if (fee) {
            transactionRequest.fee = fee.toString();
            transactionRequest.recipientsPayFees = !!recipientsPayFees;
        }
        return this.http.post<SendResponse>(
            `${server}/wallet/${coin.shortName}/tx`,
            transactionRequest, {
                withCredentials: true
            }).pipe(tap(() => this.getBalance(coin, true)));
    }
}
