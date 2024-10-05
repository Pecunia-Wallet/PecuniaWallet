import {Routes} from "@angular/router";
import {WalletComponent} from "./components/wallet/wallet.component";
import {WindowComponent} from "./components/window/window.component";
import {SidebarComponent} from "./components/wallet/sidebar/sidebar.component";
import {lockGuard} from "./guards/lock.guard";
import {authorizedGuard} from "./guards/authorized.guard";
import {authorizableGuard} from "./guards/authorizable.guard";
import {anonymousGuard} from "./guards/anonymous.guard";
import {identityDeactivateGuard, identityGuard} from "./guards/identity.guard";
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

export const routes: Routes = [
    {
        path: "", canActivate: [authorizedGuard, inverseSyncGuard],
        component: WindowComponent, title: "Pecunia Wallet", children: [
            {
                path: "", pathMatch: "full", redirectTo: "wallet"
            },
            {
                path: "wallet", canActivate: [desktopCoinGuard],
                component: WalletComponent, title: "Your Pecunia", children: [
                    {
                        path: "", pathMatch: "full", canActivate: [menuPageGuard, coinlessGuard],
                        component: SidebarComponent
                    },
                    {
                        path: "coin", data: {animation: "coin"},
                        canActivate: [coinGuard], children: [
                            {
                                path: "", data: {animation: "coin"},
                                component: CoinComponent

                            },
                            {
                                path: "tx", data: {animation: "tx"},
                                canActivate: [transactionGuard],
                                loadComponent: () =>
                                    import("./components/wallet/transaction/transaction.component")
                                        .then(c => c.TransactionComponent)
                            },
                            {
                                path: "import", data: {animation: "import"},
                                loadComponent: () =>
                                    import("./components/wallet/import/import.component")
                                        .then(c => c.ImportComponent)
                            },
                            {
                                path: "receive", data: {animation: "receive"},
                                loadComponent: () =>
                                    import("./components/wallet/receive/receive.component")
                                        .then(c => c.ReceiveComponent)
                            },
                            {
                                path: "request/build", data: {animation: "request-builder"},
                                loadComponent: () =>
                                    import("./components/wallet/request-builder/request-builder.component")
                                        .then(c => c.RequestBuilderComponent)
                            },
                            {
                                path: "request/view", data: {animation: "request"},
                                canActivate: [requestViewGuard], loadComponent: () =>
                                    import("./components/wallet/request/request.component")
                                        .then(c => c.RequestComponent)
                            },
                            {
                                path: "request/read", data: {animation: "request-reader"},
                                canActivate: [requestedGuard], loadComponent: () =>
                                    import("./components/wallet/request-reader/request-reader.component")
                                        .then(c => c.RequestReaderComponent)
                            },
                            {
                                path: "send", data: {animation: "send-recipients"},
                                loadComponent: () =>
                                    import("./components/wallet/send-step-recipients/send-step-recipients.component")
                                        .then(c => c.SendStepRecipientsComponent)
                            },
                            {
                                path: "send/fee", data: {animation: "send-fee"},
                                canActivate: [sendStepFeeGuard], loadComponent: () =>
                                    import("./components/wallet/send-step-fee/send-step-fee.component")
                                        .then(c => c.SendStepFeeComponent)
                            },
                            {
                                path: "send/success", data: {animation: "send-success"},
                                canActivate: [idGuard], loadComponent: () =>
                                    import("./components/wallet/send-successful/send-successful.component")
                                        .then(c => c.SendSuccessfulComponent)
                            },
                            {
                                path: "send/error", data: {animation: "send-success"},
                                canActivate: [codeGuard], loadComponent: () =>
                                    import("./components/wallet/send-error/send-error.component")
                                        .then(c => c.SendErrorComponent)
                            }
                        ]
                    }
                ]
            },
            {
                path: "office", title: "Pecunia Office", loadComponent: () =>
                    import("./components/office/office.component")
                        .then(c => c.OfficeComponent)
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
