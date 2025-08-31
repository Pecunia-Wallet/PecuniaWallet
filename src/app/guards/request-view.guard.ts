import {CanActivateFn, Router} from "@angular/router";
import BigNumber from "bignumber.js";
import {inject} from "@angular/core";

export const requestViewGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const amount = route.queryParamMap.get("amount");
    const address = route.queryParamMap.get("addr");

    console.log(amount, address);

    if (!amount || !address) {
        router.navigate([`/wallet/coin/request/build`], { queryParams: route });
        return false;
    }

    try {
        new BigNumber(amount);
    } catch (err) {
        router.navigate([`/wallet/coin/request/build`], { queryParams: route });
        return false;
    }

    return true;
};
