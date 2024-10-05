import {CanActivateFn, Router} from "@angular/router";
import {inject} from "@angular/core";
import {BrokerService} from "../services/broker.service";

export const sendStepFeeGuard: CanActivateFn = (route, state) => {
    const broker = inject(BrokerService);
    const router = inject(Router);

    const sendData = !!broker.data?.sendData;
    if (!sendData) router.navigate(["/wallet/coin/send"]);

    return !!broker.data?.sendData;
};
