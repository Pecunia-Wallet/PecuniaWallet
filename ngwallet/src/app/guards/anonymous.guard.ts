import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {AuthService} from "../services/auth.service";
import {map} from "rxjs";

export const anonymousGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isAuthorized().pipe(map(auth => {
        if (auth) router.navigate([""], {
            queryParamsHandling: "preserve"
        });
        return !auth;
    }));
};
