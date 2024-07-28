import {CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";

export const requestedGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    const requested = (router.getCurrentNavigation()?.extras.state as any)?.requested;
    if (!requested) router.navigate(["/"]);

    return requested;
};
