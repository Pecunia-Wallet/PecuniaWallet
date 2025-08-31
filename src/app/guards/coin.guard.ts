import {ActivatedRoute, CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";
import {CurrencyService} from "../services/currency.service";
import {map} from "rxjs";
import {WindowComponent} from "../components/window/window.component";

export const desktopCoinGuard: CanActivateFn = (route, state) => {
    if (!WindowComponent.isMobile()) return coinGuard(route, state);
    return true;
};

export const coinGuard: CanActivateFn = (route, state) => {
    const currencyService = inject(CurrencyService);
    const router = inject(Router);

    const coins = currencyService.getCoins();
    const coin = route.queryParamMap.get("n");
    if (!coin || !currencyService.findCoinByShortName(coin)) {
        router.navigate([state.url], {
            queryParams: {
                n: coins[0].shortName.toLowerCase()
            },
            queryParamsHandling: "merge"
        });
        return false;
    }
    return true;
};

export const coinlessGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const aRoute = inject(ActivatedRoute);

    if (route.queryParamMap.get("n")) {
        router.navigate(["./"], {
            relativeTo: aRoute,
            queryParams: {
                n: null
            },
            queryParamsHandling: "merge"
        });
        return false;
    }

    return true;
};
