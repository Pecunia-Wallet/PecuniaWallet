import {Component, HostListener, OnInit} from "@angular/core";
import {Router, RouterOutlet} from "@angular/router";
import {BarLink, FloatBarComponent} from "./float-bar/float-bar.component";
import {HammerModule} from "@angular/platform-browser";
import {IdentityService} from "../../services/identity.service";
import {faCashRegister, faWallet} from "@fortawesome/free-solid-svg-icons";
import {mobileModeScreenWidth} from "../../app.config";
import {SidebarComponent} from "../wallet/sidebar/sidebar.component";
import {RouteTrackerService} from "../../services/route-tracker.service";

@Component({
    selector: "app-window",
    standalone: true,
    imports: [
        RouterOutlet,
        FloatBarComponent,
        HammerModule,
        SidebarComponent
    ],
    templateUrl: "./window.component.html",
    styleUrl: "./window.component.scss"
})
export class WindowComponent {

    constructor(private routeTracker: RouteTrackerService,
                private router: Router) {
    }

    static isMobile(): boolean {
        return document.body.clientWidth < mobileModeScreenWidth;
    }

    @HostListener("window:resize")
    isMobile(): boolean {
        return WindowComponent.isMobile();
    }

    getTimeZone(): string {
        const offsetHours = -new Date().getTimezoneOffset() / 60;
        return `UTC${offsetHours > 0 ? '+' : ''}${offsetHours}`;
    }

    toWallet() {
        const lastWalletRouting = this.routeTracker.getLast("wallet");
        console.log(lastWalletRouting);
        if (lastWalletRouting.route) {
            this.router.navigate([`/wallet/${lastWalletRouting.route}`], {
                queryParamsHandling: "merge",
                queryParams: lastWalletRouting.queryParams
            });
        } else {
            this.router.navigate(["/wallet"], {
                queryParamsHandling: "merge"
            });
        }
    }

    menuId = "walletNavBar";
    menuItems: BarLink[] = [
        {
            text: "Wallet",
            uri: "/wallet",
            onClick: () => this.toWallet(),
            image: faWallet
        },
        {
            text: "API/SCI",
            uri: "/office",
            image: faCashRegister
        }
    ];

}
