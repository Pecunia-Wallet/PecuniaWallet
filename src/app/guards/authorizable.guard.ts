import {CanActivateFn} from '@angular/router';
import {inject} from "@angular/core";
import {CookieService} from "ngx-cookie-service";
import {server, tokenCookieName} from "../app.config";
import {AuthService} from "../services/auth.service";

export const authorizableGuard: CanActivateFn = () => {
    const cookies = inject(CookieService);
    const auth = inject(AuthService);

    const token = cookies.get(tokenCookieName);
    const authorizable = !!token && token.trim().length > 0;
    if (!authorizable) auth.logout();
    return authorizable;
};
