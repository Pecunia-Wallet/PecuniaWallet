import {CanActivateFn, CanDeactivateFn} from "@angular/router";
import {inject} from "@angular/core";
import {IdentityService} from "../services/identity.service";
import {Location} from "@angular/common";

export const identityGuard: CanActivateFn = () => {
    const id = inject(IdentityService);
    const location = inject(Location);

    if (!id.approvalRequested) location.back();
    return id.approvalRequested;
};

export const identityDeactivateGuard: CanDeactivateFn<any> = () => {
    const id = inject(IdentityService);
    if (id.approvalRequested) id.proved$.next(false);

    return true;
};

