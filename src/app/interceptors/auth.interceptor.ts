import {HttpClient, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from "@angular/core";
import {AuthService} from "../services/auth.service";
import {server} from "../app.config";
import {Observable, of, switchMap, tap} from "rxjs";
import {apiToken} from "../../environment/env";
import {WalletService} from "../services/wallet.service";

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
    const auth = inject(AuthService);
    // const http = inject(HttpClient);
    const wallet = inject(WalletService);

    // if (req.url === `${server}/csrf`) return next(req);

    const api = req.url.startsWith(`${server}/api`);
    if (auth.getToken() && req.withCredentials) {
        const _apiToken: Observable<string> = api ? apiToken ? of(apiToken as string)
            : wallet.getApiToken() : of(null as any);
        return _apiToken.pipe(switchMap(token => {
            if (api && !token) {
                throw new Error(`Api token is ${apiToken} when required.`);
            }
            req = req.clone({
                headers: req.headers.set(`X-${api ? "Api-" : ""}Token`, api ? token! : auth.getToken()!)
            });

            return next(req);
        }));
    }

    return next(req);

    // if (api) return next(req);

    // if (!req.context.get(CSRF)) {
    //     return next(req);
    // }
    //
    // const csrfToken = auth.getCsrfToken();
    // if (csrfToken) {
    //     req = req.clone({
    //         headers: req.headers.set(csrfHeaderName, csrfToken)
    //     });
    //     return next(req);
    // } else {
    //     return http.get(`${server}/csrf`).pipe(
    //         tap(() => {
    //             req = req.clone({
    //                 headers: req.headers.set(csrfHeaderName, auth.getCsrfToken())
    //             });
    //         }),
    //         switchMap(() => next(req))
    //     );
    // }
};
