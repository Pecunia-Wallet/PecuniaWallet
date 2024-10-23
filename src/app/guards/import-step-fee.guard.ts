import {CanActivateFn, Router} from '@angular/router';
import {inject} from "@angular/core";
import {BrokerService} from "../services/broker.service";

export const importStepFeeGuard: CanActivateFn = (route, state) => {
    const broker = inject(BrokerService);
    const router = inject(Router);

    const keys = !!broker.data?.import?.keys;
    console.log(broker.data, broker.data?.import, keys)
    if (!keys) router.navigate(["/wallet/coin/import"], {
        queryParamsHandling: "merge"
    });

    return keys;
};
