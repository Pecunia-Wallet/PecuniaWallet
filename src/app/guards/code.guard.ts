import {CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";

export const codeGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    const codeParam = parseInt(route.queryParamMap.get("code")!);
    const codePresents = codeParam != 0 && !codeParam;
    if (!codePresents) router.navigate(["/"]);

    return codePresents;
};
