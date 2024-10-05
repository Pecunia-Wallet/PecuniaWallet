import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {AuthService} from "../services/auth.service";
import {map} from "rxjs";

export const lockGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.hasLockPermission().pipe(
        map(permission => {
            if (!permission) router.navigate(["/"], {
                queryParamsHandling: "preserve"
            });
            return permission;
        })
    );
};
