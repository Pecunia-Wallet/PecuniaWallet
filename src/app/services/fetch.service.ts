import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable, of, ReplaySubject, retry, switchMap, tap} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {fromPromise} from "rxjs/internal/observable/innerFrom";

export const minutesDifference = (d1: Date, d2: Date): number => {
    if (!d1) d1 = new Date(0);
    if (!d2) d2 = new Date(0);
    return Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60);
};

export const hoursDifference = (d1: Date, d2: Date): number => {
    return minutesDifference(d1, d2) / 60;
};

export interface HttpRenewOpts {
    url: string;
    sendCredentials?: boolean;
    raw?: boolean;
    retry?: number;
}

export interface FetchConfig<R, T> {
    subject: BehaviorSubject<T>;
    when?: (value: T) => boolean;
    parse?: (data: R | string) => T | Observable<T> | Promise<T>;
    renew: HttpRenewOpts | ((v: T) => Observable<R>);
}

const configsEqual = <T, R>(conf1: FetchConfig<T, R>, conf2: FetchConfig<T, R>) => {
    return conf1.subject == conf2.subject;
};

@Injectable({
    providedIn: "root"
})
export class FetchService {

    constructor(private http: HttpClient) {}

    requestCache: [FetchConfig<any, any>, ReplaySubject<any>][] = [];

    public fetch<R, T>(conf: FetchConfig<R, T>): Observable<T> {
        if (!conf.subject?.value || !conf.when || conf.when(conf.subject.value)) {
            const loadingRequest = this.requestCache
                .find(([_conf]) => configsEqual(conf, _conf));
            if (loadingRequest) return loadingRequest[1].asObservable();
            let opts: HttpRenewOpts = conf.renew as HttpRenewOpts;
            const renew = !("url" in conf.renew) ? conf.renew :
                (): Observable<R | string> => {
                    const httpParams: any = {
                        withCredentials: opts.sendCredentials
                    };
                    if (opts.raw) httpParams.responseType = "text";
                    return opts.raw
                        ? this.http.get(opts.url, httpParams)
                            .pipe(retry(opts.retry || 1)) as unknown as Observable<string>
                        : this.http.get<R>(opts.url, httpParams)
                            .pipe(retry(opts.retry || 1)) as Observable<R>;
                };

            const requestSubject = new ReplaySubject<T>(1);

            const completeRequest = (data: T) => {
                conf.subject.next(data);
                requestSubject.next(data);
                requestSubject.complete();
                this.requestCache = this.requestCache
                    .filter(([_conf]) => conf != _conf);
            };

            renew(conf.subject.value).pipe(switchMap((response: string | R) => {
                const parse = conf.parse || ((r: R | string) => r as unknown as T);
                let data = parse(opts.raw ? response as string : response as R);
                if (data instanceof Promise) data = fromPromise(data);
                if (data instanceof Observable) {
                    return data.pipe(
                        tap(completeRequest)
                    );
                } else {
                    completeRequest(data);
                    return of(data);
                }
            })).subscribe({
                error: (err) => {
                    requestSubject.error(err);
                    this.requestCache = this.requestCache
                        .filter(([_conf]) => !configsEqual(conf, _conf));
                }
            });

            this.requestCache.push([conf, requestSubject]);
            return requestSubject.asObservable();
        } else {
            return of(conf.subject.value);
        }
    }

}
