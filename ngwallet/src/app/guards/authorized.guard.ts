import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {AuthService} from "../services/auth.service";
import {map} from "rxjs";

function parseUrl(queryString: string): { url: string, params: { [key: string]: string } } {
    const [url, paramString] = queryString.split('?');
    const params: { [key: string]: string } = {};

    if (paramString) {
        const paramPairs = paramString.split('&');
        for (const pair of paramPairs) {
            const [key, value] = pair.split('=');
            params[key] = value;
        }
    }

    return { url, params };
}

export const authorizedGuard: CanActivateFn = (_, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const route = parseUrl(state.url);
    auth.navigateAfterAuth(route.url, route.params);
    return auth.isAuthorized().pipe(map(auth => {
        if (!auth) router.navigate(["unlock"], {
            queryParamsHandling: "preserve"
        });
        return auth;
    }));
};
