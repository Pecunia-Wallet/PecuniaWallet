import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {FetchService, minutesDifference} from "./fetch.service";
import {BehaviorSubject, Observable} from "rxjs";
import {server} from "../app.config";

export interface CoinSum {
    coin: string;
    amount: number;
}

export interface InvoiceAggregate {
    date: Date;
    count?: number;
    amount?: number;
}

export interface InvoiceCount {
    open: number;
    completed: number;
    failed: number;
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class StatisticService {

    operationSum$ = new BehaviorSubject<CoinSum[]>(null as any);
    lastOperationSumUpdate: Date;
    lastOperationSumType: string;
    lastOperationSumDays: number;
    aggregate$ = new BehaviorSubject<InvoiceAggregate[]>(null as any);
    lastAggregateUpdate: Date;
    lastAggregateScale: string;
    lastAggregateDays: number;
    count$ = new BehaviorSubject<InvoiceCount>(null as any);
    lastCountUpdate: Date;
    lastCountDays: number;

    constructor(private http: HttpClient,
                private fetcher: FetchService) {
    }

    getOperationSum(type: "received" | "requested" | "pending", days: number) {
        return this.fetcher.fetch({
            subject: this.operationSum$,
            when: v => !v ||
                minutesDifference(this.lastOperationSumUpdate, new Date()) > 3 ||
                type != this.lastOperationSumType || days != this.lastOperationSumDays,
            renew: {
                url: `${server}/statistics/sum`,
                sendCredentials: true,
                queryParams: { type: type, days: days },
                retry: 3
            },
            parse: data => {
                this.lastOperationSumUpdate = new Date();
                this.lastOperationSumType = type;
                this.lastOperationSumDays = days;
                return data as CoinSum[];
            }
        });
    }

    getAggregate(scale: "days" | "hours" | "months", days: number): Observable<InvoiceAggregate[]> {
        return this.fetcher.fetch({
            subject: this.aggregate$,
            when: v => !v ||
                minutesDifference(this.lastAggregateUpdate, new Date()) > 3 ||
                scale != this.lastAggregateScale || days != this.lastAggregateDays,
            renew: {
                url: `${server}/statistics/aggregate`,
                sendCredentials: true,
                queryParams: { scale: scale, days: days },
                retry: 3
            },
            parse: data => {
                this.lastAggregateUpdate = new Date();
                this.lastAggregateScale = scale;
                this.lastAggregateDays = days;
                (data as InvoiceAggregate[]).forEach(a => {
                    a.date = new Date(a.date);
                });
                return data as InvoiceAggregate[];
            }
        });
    }

    countInvoices(days: number): Observable<InvoiceCount> {
        return this.fetcher.fetch({
            subject: this.count$,
            when: v => !v ||
                minutesDifference(this.lastCountUpdate, new Date()) > 3 ||
                days != this.lastCountDays,
            renew: {
                url: `${server}/statistics/count`,
                sendCredentials: true,
                queryParams: { days: days },
                retry: 3
            },
            parse: (data: any) => {
                this.lastCountUpdate = new Date();
                this.lastCountDays = days;
                data.completed = data.completed ?? 0;
                data.open = data.open ?? 0;
                data.failed = data.failed ?? 0;
                data.total = data.completed + data.open + data.failed;
                return data;
            }
        });
    }

}
