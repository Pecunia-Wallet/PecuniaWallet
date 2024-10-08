import { inject } from '@angular/core';
import {CanActivateFn, Router, RouterStateSnapshot} from '@angular/router';
import {RouteTrackerService} from "../services/route-tracker.service";

export const persistRouteGuard = (name: string, defaultRoute: string, state: RouterStateSnapshot) => {
    const router = inject(Router);
    const routeTracker = inject(RouteTrackerService);

    if (state.url.split('?')[0].replace("/", "") == name) {
        const lastOfficeRouting = routeTracker.getLast(name);

        const clearParams = { id: null, n: null };

        if (lastOfficeRouting.route) {
            router.navigate([`/${name}/${lastOfficeRouting.route}`], {
                queryParamsHandling: "merge",
                queryParams: {...lastOfficeRouting.queryParams, ...clearParams}
            });
            return false;
        } else {
            router.navigate([`/${name}/${defaultRoute}`], {
                queryParamsHandling: "merge",
                queryParams: {...clearParams}
            });
            return false;
        }
    }

    return true;

}

export const officeRouteGuard: CanActivateFn = (_, state) => {
    return persistRouteGuard("office", "home", state);
};