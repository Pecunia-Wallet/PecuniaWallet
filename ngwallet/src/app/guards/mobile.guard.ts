import {CanActivateFn} from "@angular/router";
import {mobileModeScreenWidth} from "../app.config";

export const mobileGuard: CanActivateFn = (route, state) => {
    return document.body.clientWidth < mobileModeScreenWidth;
};
