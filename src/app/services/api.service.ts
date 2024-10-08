import {Injectable} from "@angular/core";
import {WalletService} from "./wallet.service";
import BigNumber from "bignumber.js";
import {BehaviorSubject, forkJoin, map, Observable, retry, Subject, take} from "rxjs";
import {HttpClient, HttpContext, HttpResponse} from "@angular/common/http";
import {minutesToISO8601Duration, server} from "../app.config";
import {Coin} from "../models/Coin";
import {FetchService} from "./fetch.service";
import {FiatCurrency} from "../models/FiatCurrency";
import {Currency} from "../models/Currency";

export interface Invoice {
    id: string;
    status: "pending" | "staggering" | "completed" | "overpaid" | "expired";
    amount: {
        requested: BigNumber;
        received: BigNumber;
        pending: BigNumber;
    };
    sourceCurrency: string;
    creationDate: Date;
    expires?: {
        date: Date;
        duration: string;
    };
    closureDate?: Date;
    availableCoins?: string[];
    operationCoin?: string;
    exchangeRate?: BigNumber;
    relatedTransactions?: string[];
    meta?: any;
}

export interface Settings {
    id: string;
    name: string;
    email: string;
    inaccuracyPercent: number;
    inaccuracyType: "none" | "both" | "overpayment" | "underpayment";
    aboutUrl: string;
    supportUrl: string;
    defaultCallbackUrl: string;
    successCallbackUrl: string;
    failureCallbackUrl: string;
    notifyOnChange: boolean;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
}

@Injectable({
    providedIn: "root"
})
export class ApiService {

    constructor(private fetcher: FetchService,
                private http: HttpClient) {
        this.getSettings().subscribe();
        this.getName().subscribe();
        this.getId().subscribe();
    }

    image$ = new BehaviorSubject<Blob>(null as any);
    settings$ = new BehaviorSubject<Settings>(null as any);
    name$ = new BehaviorSubject<string>(null as any);
    id$ = new BehaviorSubject<string>(null as any);

    getAllInvoices(pageNum: number = 0, pageSize: number = 20,
                   sort: string = "creationDate", order: "asc" | "desc" = "desc",
                   search?: string, filter?: string, extendWith?: string[]
    ): Observable<{
        body: Array<Invoice>, items: {
            total: number,
            remaining: number
        }
    }> {
        return this.http.get<Array<Invoice>>(`${server}/api/invoices`, {
            withCredentials: true,
            params: {
                filter: filter || "",
                search: search || "",
                pageSize: pageSize,
                pageNum: pageNum,
                sort: sort,
                order: order,
                extendWith: extendWith?.join(",") || ""
            },
            observe: "response",
        }).pipe(retry(3), map(res => {
            return {
                body: res!.body!.map(i => this.parseInvoice(i)),
                items: {
                    total: +res.headers.get("X-Total-Count")!,
                    remaining: +res.headers.get("X-Items-Remaining")!
                }
            }
        }))
    }

    getInvoice(id: string): Observable<Invoice> {
        return this.http.get<Invoice>(`${server}/api/invoices/${id}`, {
            withCredentials: true,
            params: {
                includeMeta: true
            }
        }).pipe(retry(3), map(i => this.parseInvoice(i)));
    }

    createInvoice(amount: BigNumber, sourceCurrency: Currency,
                  availableCoins?: Coin[], lifeTimeMinutes?: number,
                  name?: string, image?: string, purpose?: string): Observable<void> {
        const body: any = {
            amount: amount.toString(),
            sourceCurrency: sourceCurrency.shortName
        };
        if (availableCoins) body.availableCoins = availableCoins.map(c => c.shortName);
        if (lifeTimeMinutes) body.lifeTime = minutesToISO8601Duration(lifeTimeMinutes);
        if (name || image) body.info = {};
        if (name) body.info.name = name;
        if (image) body.info.image = image;
        if (purpose) body.meta = {purpose: purpose};
        return this.http.post(`${server}/api/invoices`, body, {
            withCredentials: true
        }).pipe(map(() => {}));
    }

    getId() {
        return this.fetcher.fetch({
            subject: this.id$,
            when: v => !v,
            renew: {
                url: `${server}/api/account/id`,
                retry: 3,
                raw: true,
                sendCredentials: true
            },
        });
    }

    getSettings(): Observable<Settings> {
        return this.fetcher.fetch({
            subject: this.settings$,
            when: v => !v,
            renew: () => forkJoin([
                this.http.get<Settings>(`${server}/api/settings`, {
                    withCredentials: true, params: {
                        query: [
                            "name", "email", "inaccuracy",
                            "aboutUrl", "supportUrl",
                            "defaultCallbackUrl", "successCallbackUrl", "failureCallbackUrl",
                            "notifyOnChange", "notifyOnSuccess", "notifyOnFailure"
                        ].join(",")
                    }
                }).pipe(retry(3), take(1)),
                this.getId().pipe(take(1))
            ]),
            parse: ([settings, id]: string | [Settings, string]) => {
                const s = settings as Settings;
                return {
                    name: s.name,
                    email: s.email,
                    inaccuracyPercent: s.inaccuracyPercent,
                    inaccuracyType: s.inaccuracyType?.toLowerCase(),
                    aboutUrl: s.aboutUrl,
                    supportUrl: s.supportUrl,
                    defaultCallbackUrl: s.defaultCallbackUrl,
                    successCallbackUrl: s.successCallbackUrl,
                    failureCallbackUrl: s.failureCallbackUrl,
                    notifyOnChange: s.notifyOnChange,
                    notifyOnSuccess: s.notifyOnSuccess,
                    notifyOnFailure: s.notifyOnFailure,
                    id: id
                } as Settings
            }
        });
    }

    getName(): Observable<string> {
        return this.fetcher.fetch({
            subject: this.name$,
            when: v => !v,
            renew: () => forkJoin([
                this.http.get<Settings>(`${server}/api/settings`, {
                    withCredentials: true, params: { query: "name" }
                }).pipe(retry(3), take(1)),
                this.getId().pipe(take(1))
            ]),
            parse: ([s, id]: string | [any, string]) => {
                return s.name ?? id
            }
        });
    }

    patchSettings(settings: Settings): Observable<Settings> {
        return this.http.patch<Settings>(`${server}/api/settings/`, settings, {
            withCredentials: true,
        }).pipe(retry(1));
    }

    isAccessGranted(): Observable<boolean> {
        return this.http.get(`${server}/account/keys`, {
            withCredentials: true,
            responseType: "text"
        }).pipe(retry(3), map(r => r?.toLowerCase() == "true"));
    }

    getImage(forceRenew?: boolean): Observable<Blob> {
        return this.fetcher.fetch({
            subject: this.image$,
            when: i => !i || !!forceRenew,
            renew: () => this.http.get(`${server}/api/account/image`, {
                withCredentials: true,
                responseType: "blob"
            }).pipe(retry(1))
        });
    }

    private parseInvoice(invoice: Invoice): Invoice {
        const parsed: Invoice = {
            id: invoice.id,
            amount: {
                requested: new BigNumber(invoice.amount.requested),
                received: new BigNumber(invoice.amount.received),
                pending: new BigNumber(invoice.amount.pending),
            },
            creationDate: this.parseDate(invoice.creationDate),
            sourceCurrency: invoice.sourceCurrency,
            status: invoice.status.toLowerCase() as any,
            operationCoin: invoice.operationCoin,
            availableCoins: invoice.availableCoins,
            relatedTransactions: invoice?.relatedTransactions
        };
        if (invoice.closureDate) {
            parsed.closureDate = this.parseDate(invoice.creationDate);
        }
        if (invoice.expires) {
            parsed.expires = {
                date: this.parseDate(invoice.expires.date),
                duration: invoice.expires.duration
            };
        }
        if (invoice.exchangeRate) {
            parsed.exchangeRate = new BigNumber(invoice.exchangeRate);
        }
        if (invoice.meta) {
            try {
                parsed.meta = JSON.parse(this.atobUtf8(invoice.meta));
            } catch (_) { /*empty*/
            }
        }
        return parsed;
    }

    private atobUtf8(base64: string): string {
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    }

    private parseDate(date: Date): Date {
        return new Date(date as any);
    }

}
