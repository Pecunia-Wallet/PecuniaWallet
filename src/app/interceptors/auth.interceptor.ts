import {HttpClient, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {inject} from "@angular/core";
import {AuthService} from "../services/auth.service";
import {CSRF, csrfHeaderName, server} from "../app.config";
import {Observable, of, switchMap, tap} from "rxjs";


export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<any> => {
    const auth = inject(AuthService);
    const http = inject(HttpClient);
    const token = auth.getToken();

    if (req.url == `${server}/csrf`) return next(req);

    if (token && req.withCredentials) {
        req = req.clone({
            headers: req.headers.set("X-Token", auth.getToken() || "")
        });
    }

    const appendCsrfToken = (): Observable<any> => {
        if (!req.context.get(CSRF)) return of(req);
        let csrfToken = auth.getCsrfToken();
        if (csrfToken) {
            req = req.clone({
                headers: req.headers.set(csrfHeaderName, csrfToken)
            });
            return of(req);
        } else {
            return http.get(`${server}/csrf`).pipe(
                tap(() => {
                    req = req.clone({
                        headers: req.headers.set(csrfHeaderName, auth.getCsrfToken())
                    });
                })
            );
        }
    };

    return appendCsrfToken().pipe(
        switchMap(() => next(req))
    );
};
