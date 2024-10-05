import {CanActivateFn, CanDeactivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";
import {SyncService} from "../services/sync.service";
import {map, skipWhile} from "rxjs";

export const syncGuard: CanActivateFn = () => {
    const sync = inject(SyncService);
    const router = inject(Router);

    const navigateIf = (condition: boolean) => {
        if (!condition) router.navigate(["/"], {
            queryParamsHandling: "preserve"
        });
        return condition;
    };

    if (sync.sync$.value == undefined) return sync.sync$.pipe(map(v => navigateIf(!!v)));
    return navigateIf(sync.sync$.value);
};

export const inverseSyncGuard: CanDeactivateFn<any> = () => {
    const sync = inject(SyncService);
    const router = inject(Router);

    const navigateUnless = (condition: boolean) => {
        if (!condition) router.navigate(["sync"], {
            queryParamsHandling: "preserve"
        });
        return condition;
    };

    if (sync.sync$.value == undefined) return sync.sync$.pipe(
        skipWhile(v => v == undefined),
        map(v => {
            return navigateUnless(!v)
        }));
    return navigateUnless(!sync.sync$.value);
}
