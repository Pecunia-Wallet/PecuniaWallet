import {Routes} from "@angular/router";
import {WindowComponent} from "./components/window/window.component";
import {SidebarComponent} from "./components/wallet/sidebar/sidebar.component";
import {lockGuard} from "./guards/lock.guard";
import {authorizedGuard} from "./guards/authorized.guard";
import {authorizableGuard} from "./guards/authorizable.guard";
import {anonymousGuard} from "./guards/anonymous.guard";
import {inverseSyncGuard, syncGuard} from "./guards/sync.guard";
import {coinGuard, coinlessGuard, desktopCoinGuard} from "./guards/coin.guard";
import {menuPageGuard} from "./guards/menu-page.guard";
import {transactionGuard} from "./guards/transaction.guard";
import {requestViewGuard} from "./guards/request-view.guard";
import {requestedGuard} from "./guards/requested.guard";
import {sendStepFeeGuard} from "./guards/send-step-fee.guard";
import {idGuard} from "./guards/id.guard";
import {codeGuard} from "./guards/code.guard";
import {CoinComponent} from "./components/wallet/coin/coin.component";
import {importStepFeeGuard} from "./guards/import-step-fee.guard";
import {OfficeComponent} from "./components/office/office.component";
import {officeRouteGuard} from "./guards/office-route.guard";

export const routes: Routes = [
    {
        path: "", canActivate: [authorizedGuard, inverseSyncGuard],
        component: WindowComponent, title: "Pecunia Wallet", children: [
            {
                path: "", pathMatch: "full", redirectTo: "wallet"
            },
            {
                path: "wallet", canActivate: [desktopCoinGuard],
                loadComponent: () =>
                    import("./components/wallet/wallet.component")
                        .then(c => c.WalletComponent),
                title: "Your Pecunia", children: [
                    {
                        path: "", pathMatch: "full", canActivate: [menuPageGuard, coinlessGuard],
                        component: SidebarComponent
                    },
                    {
                        path: "coin", data: {animation: "wallet-coin"},
                        canActivate: [coinGuard], children: [
                            {
                                path: "", data: {animation: "wallet-coin"},
                                component: CoinComponent
                            },
                            {
                                path: "tx", data: {animation: "wallet-tx"},
                                canActivate: [transactionGuard],
                                loadComponent: () =>
                                    import("./components/wallet/transaction/transaction.component")
                                        .then(c => c.TransactionComponent)
                            },
                            {
                                path: "import/fee", data: {animation: "wallet-import-fee"},
                                canActivate: [importStepFeeGuard], loadComponent: () =>
                                    import("./components/wallet/fee-editor/import-step-fee/import-step-fee.component")
                                        .then(c => c.ImportStepFeeComponent)
                            },
                            {
                                path: "import/error", data: {animation: "wallet-import-error"},
                                canActivate: [], loadComponent: () =>
                                    import("./components/wallet/keys/error/error.component")
                                        .then(c => c.ErrorComponent)
                            },
                            {
                                path: "export", data: {animation: "wallet-export"},
                                canActivate: [requestedGuard("wallet/coin")],
                                loadComponent: () =>
                                    import("./components/wallet/export/export.component")
                                        .then(c => c.ExportComponent)
                            },
                            {
                                path: "keys", data: {animation: "wallet-keys"},
                                canActivate: [], loadComponent: () =>
                                    import("./components/wallet/keys/keys.component")
                                        .then(c => c.KeysComponent)
                            },
                            {
                                path: "receive", data: {animation: "wallet-receive"},
                                loadComponent: () =>
                                    import("./components/wallet/receive/receive.component")
                                        .then(c => c.ReceiveComponent)
                            },
                            {
                                path: "request/build", data: {animation: "wallet-request-builder"},
                                loadComponent: () =>
                                    import("./components/wallet/request-builder/request-builder.component")
                                        .then(c => c.RequestBuilderComponent)
                            },
                            {
                                path: "request/view", data: {animation: "wallet-request"},
                                canActivate: [requestViewGuard], loadComponent: () =>
                                    import("./components/wallet/request/request.component")
                                        .then(c => c.RequestComponent)
                            },
                            {
                                path: "request/read", data: {animation: "wallet-request-reader"},
                                canActivate: [requestedGuard("wallet/coin/send",
                                        route => !route.queryParams["uri"] &&
                                            !new URLSearchParams(window.location.search).get("uri"))],
                                loadComponent: () =>
                                    import("./components/wallet/request-reader/request-reader.component")
                                        .then(c => c.RequestReaderComponent)
                            },
                            {
                                path: "send", data: {animation: "wallet-send-recipients"},
                                loadComponent: () =>
                                    import("./components/wallet/send-step-recipients/send-step-recipients.component")
                                        .then(c => c.SendStepRecipientsComponent)
                            },
                            {
                                path: "send/fee", data: {animation: "wallet-send-fee"},
                                canActivate: [sendStepFeeGuard], loadComponent: () =>
                                    import("./components/wallet/fee-editor/send-step-fee/send-step-fee.component")
                                        .then(c => c.SendStepFeeComponent)
                            },
                            {
                                path: "send/success", data: {animation: "wallet-send-success"},
                                canActivate: [idGuard], loadComponent: () =>
                                    import("./components/wallet/send-successful/send-successful.component")
                                        .then(c => c.SendSuccessfulComponent)
                            },
                            {
                                path: "send/error", data: {animation: "wallet-send-success"},
                                canActivate: [codeGuard], loadComponent: () =>
                                    import("./components/wallet/send-error/send-error.component")
                                        .then(c => c.SendErrorComponent)
                            }
                        ]
                    }
                ]
            },
            {
                path: "office", title: "Pecunia Office", canActivate: [officeRouteGuard],
                component: OfficeComponent,
                children: [
                    {
                        path: "home" , loadComponent: () =>
                            import("./components/office/dashboard/dashboard.component")
                                .then(c => c.DashboardComponent)
                    },
                    {
                        path: "history", loadComponent: () =>
                            import("./components/office/history/history.component")
                                .then(c => c.HistoryComponent)
                    },
                    {
                        path: "settings", loadComponent: () =>
                            import("./components/office/settings/settings.component")
                                .then(c => c.SettingsComponent)
                    }
                ]
            }
        ]
    },
    {
        path: "lock", title: "Lock Pecunia", canActivate: [lockGuard], loadComponent: () =>
            import("./components/code/lock/lock.component")
                .then(c => c.LockComponent)
    },
    {
        path: "unlock", title: "Unlock Pecunia",
        canActivate: [authorizableGuard, anonymousGuard],
        loadComponent: () => import("./components/code/unlock/unlock.component")
            .then(c => c.UnlockComponent)
    },
    {
        path: "sync", title: "Pecunia Sync",
        canActivate: [authorizedGuard, syncGuard], canDeactivate: [inverseSyncGuard],
        loadComponent: () => import("./components/sync/sync.component")
            .then(c => c.SyncComponent)
    },
    {
        path: "**", redirectTo: ""
    }
];
