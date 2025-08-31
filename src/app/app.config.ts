import {ApplicationConfig, importProvidersFrom} from "@angular/core";
import {ActivatedRoute, PreloadAllModules, provideRouter, withPreloading, withRouterConfig} from "@angular/router";

import {routes} from "./app.routes";
import {HttpContextToken, provideHttpClient, withInterceptors} from "@angular/common/http";
import {authInterceptor} from "./interceptors/auth.interceptor";
import {provideCharts, withDefaultRegisterables} from "ng2-charts";
import {authToken, serverUri} from "../environment/env";

import {HammerModule} from "@angular/platform-browser";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideEnvironmentNgxMask} from "ngx-mask";
import BigNumber from "bignumber.js";
import {providePrimeNG} from "primeng/config";
import {provideAnimationsAsync} from "@angular/platform-browser/animations/async";
import Aura from "@primeng/themes/aura";
import {definePreset} from "@primeng/themes";
import {provideHotToastConfig} from "@ngxpert/hot-toast";
import {ChartOptions, TooltipItem, TooltipOptions} from "chart.js";
import {_DeepPartialObject} from "chart.js/dist/types/utils";
import {Transaction} from "./models/Transaction";

const PrimeNgPreset = definePreset(Aura, {
    semantic: {
        primary: {
            500: "#2b2e4a",
            50: "#f8f8f9",
            100: "rgba(43,46,74,0.2)",
            600: "rgba(43,46,74,0.7)",
            700: "rgba(43,46,74,0.9)"
        }
    },
    components: {
        tooltip: {
            background: "#2b2e4a !important",
            color: "#fff !important"
        }
    }
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes, withRouterConfig({
            onSameUrlNavigation: "reload"
        }), withPreloading(PreloadAllModules)),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideCharts(withDefaultRegisterables()),
        provideAnimations(),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: PrimeNgPreset,
                options: {
                    darkModeSelector: ".never"
                }
            },
            inputStyle: "filled",
            ripple: true
        }),
        provideEnvironmentNgxMask(),
        provideHotToastConfig({
            dismissible: true,
            stacking: "depth",
            visibleToasts: 5,
            duration: 2000,
            style: {
                borderRadius: "50px",
                padding: "10px 20px",
                fontWeight: "700",
                boxShadow: "var(--hot-toast-shadow, 0 0px 20px 0px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05))"
            }
        }),
        importProvidersFrom([
            HammerModule,
            // NgxQrcodeStylingModule
        ])
    ]
};

export const server: string = serverUri as any;
export const promo = false;
export const testnet = false;
export const mobileModeScreenWidth = 925; // mobile if screen with < this value
export const tokenCookieName = "wat";
export const token = authToken;

export const toolTipConfig: _DeepPartialObject<TooltipOptions> = {
    backgroundColor: "#fff",
    bodyColor: "#2b2e4a",
    bodyFont: {
        family: "Ubuntu",
        size: 14,
        weight: "lighter"
    },
    titleColor: "#2b2e4a",
    titleFont: {
        family: "Ubuntu",
        size: 16,
        weight: "bold"
    },
    boxPadding: 5,
    displayColors: false,
    usePointStyle: true,
    padding: {
        x: 20,
        y: 10
    },
    borderWidth: 1,
    borderColor: "rgba(43,46,74,0.25)"
};

export const doughnutConfig: ChartOptions<"doughnut"> = {
    locale: "en-US",
    responsive: true,
    elements: {
        arc: {
            hoverOffset: 3
        }
    },
    plugins: {
        legend: {
            position: "top",
            labels: {
                color: "#6a6d7f",
                font: {
                    family: "Ubuntu",
                    size: 12,
                    weight: "lighter"
                },
                pointStyle: "rectRounded",
                usePointStyle: true
            }
        },
        tooltip: toolTipConfig
    },
};

export const range = (startInclusive: number, endExclusive: number): number[] => {
    const res = [];
    for (let i = startInclusive; i < endExclusive; i++) res.push(i);
    return res;
};

export const getCoinName = (route: ActivatedRoute): string => {
    return route.snapshot.queryParamMap.get("n")?.toLowerCase() || "unknown";
};

export const dp = (v?: BigNumber, dp?: number): string => {
    if (!v || !dp) return "";
    let res = v.dp(dp).toNumber().toFixed(dp);
    if (res.includes(".")) res = res.replace(/0*$/, "");
    if (res.endsWith(".")) res = res.substring(0, res.length - 1);
    return res;
};

export const sleep = (time: number) => {
    return new Promise((resolve) =>
        setTimeout(resolve, time || 1000));
};

export const convertQueryStringToObject = (queryString: string): { [key: string]: any } => {
    return queryString.split('&').reduce((params: any, param) => {
        const [key, value] = param.split('=');
        params[key] = value;
        return params;
    }, {});
};

export const minutesToISO8601Duration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    let duration = "PT";
    if (hours > 0) {
        duration += `${hours}H`;
    }

    if (remainingMinutes > 0 || hours === 0) {
        duration += `${remainingMinutes}M`;
    }

    return duration;
};

export const base64 = (buf: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};
