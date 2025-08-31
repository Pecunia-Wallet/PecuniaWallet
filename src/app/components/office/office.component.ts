import {Component, ElementRef, HostBinding, HostListener} from "@angular/core";
import {NgForOf, NgIf, NgOptimizedImage, NgTemplateOutlet} from "@angular/common";
import {server} from "../../app.config";
import {FaIconComponent, IconDefinition} from "@fortawesome/angular-fontawesome";
import {
    faBars,
    faClockRotateLeft,
    faGear,
    faHouse,
    faPuzzlePiece,
    faWallet,
    faXmark
} from "@fortawesome/free-solid-svg-icons";
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";
import { AuthService } from "../../services/auth.service";
import {RouteTrackerService} from "../../services/route-tracker.service";
import {WalletService} from "../../services/wallet.service";
import {WindowComponent} from "../window/window.component";

class Link {
    name: string;
    icon: IconDefinition;
    href: string;

    constructor(name: string, icon: IconDefinition, href: string) {
        this.name = name;
        this.icon = icon;
        this.href = href;
    }
}

@Component({
    selector: "app-office",
    standalone: true,
    imports: [
        NgOptimizedImage,
        FaIconComponent,
        NgForOf,
        RouterLink,
        RouterLinkActive,
        RouterOutlet,
        NgTemplateOutlet,
        NgIf
    ],
    templateUrl: "./office.component.html",
    styleUrl: "./office.component.scss"
})
export class OfficeComponent {

    @HostBinding("class.mobile") get mobile() { return this._window.isMobile(); }

    links = [
        new Link("Dashboard", faHouse, "home"),
        new Link("History", faClockRotateLeft, "history"),
        new Link("Settings", faGear, "settings"),
    ];

    showMenu = false;

    constructor(private router: Router,
                private routeTracker: RouteTrackerService,
                private auth: AuthService,
                protected _window: WindowComponent) {}

    lock() {
        this.auth.clear();
        this.router.navigate(["/unlock"]);
    }

    protected readonly server = server;
    protected readonly faWallet = faWallet;
    protected readonly faBars = faBars;
    protected readonly faXmark = faXmark;
}
