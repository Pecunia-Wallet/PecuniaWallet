import {CanActivateFn} from '@angular/router';
import {inject} from "@angular/core";
import {CookieService} from "ngx-cookie-service";
import {server, tokenCookieName} from "../app.config";

export const authorizableGuard: CanActivateFn = () => {
    const cookies = inject(CookieService);

    const token = cookies.get(tokenCookieName);
    const authorizable = !!token && token.trim().length > 0;
    if (!authorizable) {
        // @ts-ignore
        window.location.href = server + "/";
    }
    return authorizable;
};
