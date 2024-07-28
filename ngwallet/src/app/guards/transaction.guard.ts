import {CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";
import {Location} from "@angular/common";

export const transactionGuard: CanActivateFn = (route, state) => {
    const _location = inject(Location);

    const id = route.queryParamMap.get("id");
    if (!id) {
        _location.back();
        return false;
    }
    return true;

};
