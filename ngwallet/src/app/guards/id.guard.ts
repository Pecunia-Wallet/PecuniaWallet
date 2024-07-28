import {CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";

export const idGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    const idPresents = !!route.queryParamMap.get("id");
    if (!idPresents) router.navigate(["/"]);

    return idPresents;
};
