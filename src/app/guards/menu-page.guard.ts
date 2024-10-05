import {CanActivateFn, Router} from "@angular/router";
import {WindowComponent} from "../components/window/window.component";
import {inject} from "@angular/core";

export const menuPageGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    if (WindowComponent.isMobile()) return true;
    else router.navigate(["/wallet/coin"], {
        queryParamsHandling: "preserve"
    });
    return true;
};
