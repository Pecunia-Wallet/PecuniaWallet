import {ApplicationConfig, importProvidersFrom} from "@angular/core";
import {ActivatedRoute, provideRouter, withRouterConfig} from "@angular/router";

import {routes} from "./app.routes";
import {HttpContextToken, provideHttpClient, withInterceptors} from "@angular/common/http";
import {authInterceptor} from "./interceptors/auth.interceptor";
import {provideCharts, withDefaultRegisterables} from "ng2-charts";
import {authToken, serverUri} from "../environment/env";

import {HammerModule} from "@angular/platform-browser";
import {NotificationAnimationType, SimpleNotificationsModule} from "angular2-notifications";
import {provideAnimations} from "@angular/platform-browser/animations";
import {NgxQrcodeStylingModule} from "ngx-qrcode-styling";
import {provideEnvironmentNgxMask} from "ngx-mask";
import BigNumber from "bignumber.js";

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes, withRouterConfig({
            onSameUrlNavigation: "reload"
        })),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAnimations(),
        provideCharts(withDefaultRegisterables()),
        provideEnvironmentNgxMask(),
        importProvidersFrom([
            HammerModule,
            NgxQrcodeStylingModule,
            SimpleNotificationsModule.forRoot({
                position: ["top", "right"],
                animate: NotificationAnimationType.Scale
            })
        ])
    ]
};

export const server = serverUri;
export const promo = false;
export const testnet = false;
export const mobileModeScreenWidth = 925; // mobile if screen with < this value
export const tokenCookieName = "wat";
export const token = authToken;
export const csrfCookieName = "XSRF-TOKEN";
export const csrfHeaderName = "X-XSRF-TOKEN";
export const binance = "https://data-api.binance.vision/api";
export const CSRF = new HttpContextToken<boolean>(() => true);

export const range = (startInclusive: number, endExclusive: number): number[] => {
    const res = [];
    for (let i = startInclusive; i < endExclusive; i++) res.push(i);
    return res;
}

export const getCoinName = (route: ActivatedRoute): string => {
    return route.snapshot.queryParamMap.get("n")?.toLowerCase() || "unknown";
}

export const dp = (v: BigNumber, dp: number): string => {
    let res = v.dp(dp).toNumber().toFixed(dp);
    if (res.includes(".")) res = res.replace(/0*$/, "");
    if (res.endsWith(".")) res = res.substring(0, res.length - 1);
    return res;
}

export const sleep = (time: number) => {
    return new Promise((resolve) =>
        setTimeout(resolve, time || 1000));
}
