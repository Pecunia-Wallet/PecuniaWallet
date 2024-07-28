import {CanActivateFn} from "@angular/router";
import BigNumber from "bignumber.js";

export const requestViewGuard: CanActivateFn = (route, state) => {
    const amount = route.queryParamMap.get("amount");
    const address = route.queryParamMap.get("addr");

    if (!amount || !address) return false;

    try {
        new BigNumber(amount);
    } catch (err) {
        return false;
    }

    return true;
};
