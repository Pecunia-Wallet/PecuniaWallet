import {ActivatedRoute, ActivatedRouteSnapshot, CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";

export function requestedGuard(link: string, extra: (route: ActivatedRouteSnapshot) => boolean = () => true): CanActivateFn {
    return (route) => {
        const router = inject(Router);

        const requested = (router.getCurrentNavigation()?.extras.state as any)?.requested;
        if (!requested && extra(route)) {
            router.navigate([link], {
                queryParamsHandling: "merge"
            });
        }

        return requested;
    };
}
