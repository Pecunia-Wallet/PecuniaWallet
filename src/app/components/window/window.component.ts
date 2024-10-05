import {Component, HostListener, OnInit} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {BarLink, FloatBarComponent} from "./float-bar/float-bar.component";
import {HammerModule} from "@angular/platform-browser";
import {IdentityService} from "../../services/identity.service";
import {faCashRegister, faWallet} from "@fortawesome/free-solid-svg-icons";
import {mobileModeScreenWidth} from "../../app.config";
import {SidebarComponent} from "../wallet/sidebar/sidebar.component";

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
export class WindowComponent implements OnInit {

    static isMobile(): boolean {
        return document.body.clientWidth < mobileModeScreenWidth;
    }

    @HostListener("window:resize")
    isMobile(): boolean {
        return WindowComponent.isMobile();
    }

    menuId = "walletNavBar";
    menuItems: BarLink[] = [
        {
            text: "Wallet",
            uri: "/wallet",
            image: faWallet
        },
        {
            text: "API/SCI",
            uri: "/office",
            image: faCashRegister
        }
    ];

    constructor() {}

    ngOnInit() {}

}
