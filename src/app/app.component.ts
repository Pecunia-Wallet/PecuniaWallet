import {Component} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {IdentityComponent} from "./components/code/identity/identity.component";
import {RouteTrackerService} from "./services/route-tracker.service";
import {CookieService} from "ngx-cookie-service";
import {HttpClient} from "@angular/common/http";
import {WalletService} from "./services/wallet.service";

@Component({
    selector: "app-root",
    standalone: true,
    imports: [
        RouterOutlet,
        IdentityComponent
    ],
    providers: [
        CookieService,
        HttpClient
    ],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss"
})
export class AppComponent {

    constructor(private routeTracker: RouteTrackerService,
                private wallet: WalletService) {
    }

}
