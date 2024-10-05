import {Component, HostBinding, OnInit} from "@angular/core";
import {ChildrenOutletContexts, RouteConfigLoadEnd, RouteConfigLoadStart, Router, RouterOutlet} from "@angular/router";
import {DropdownComponent} from "../dropdown/dropdown.component";
import {FiatSelectorComponent} from "../fiat-selector/fiat-selector.component";
import {FloatBarComponent} from "../window/float-bar/float-bar.component";
import {SidebarComponent} from "./sidebar/sidebar.component";
import {WindowComponent} from "../window/window.component";
import {NgIf, NgTemplateOutlet} from "@angular/common";
import {MenuComponent} from "./menu/menu.component";
import {animate, animateChild, group, query, style, transition, trigger} from "@angular/animations";

export const routingAnimation =
    trigger("routeAnimations", [
    ])

@Component({
    selector: "app-wallet",
    standalone: true,
    imports: [
        RouterOutlet,
        DropdownComponent,
        FiatSelectorComponent,
        FloatBarComponent,
        SidebarComponent,
        NgIf,
        MenuComponent,
        NgTemplateOutlet
    ],
    animations: [
        trigger("routeAnimations", [
            transition("* <=> *", [
                query(':enter, :leave', [
                    style({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: "100%"
                    })
                ]),
                query(":enter", [
                    style({ opacity: 0 })
                ], { optional: true }),
                query(':leave', animateChild(), { optional: true }),
                group([
                    query(":leave", [
                        animate("200ms ease-out", style({
                            opacity: 0
                        }))
                    ], { optional: true }),
                    query(":enter", [
                        animate("300ms ease-out", style({
                            opacity: 1
                        }))
                    ], { optional: true })
                ])
            ])
        ])
    ],
    templateUrl: "./wallet.component.html",
    styleUrl: "./wallet.component.scss"
})
export class WalletComponent implements OnInit {

    showLoader = false;

    constructor(protected _window: WindowComponent,
                private ctx: ChildrenOutletContexts,
                private router: Router) {}

    ngOnInit() {
        this.router.events.subscribe(event => {
            if (event instanceof RouteConfigLoadStart)
                this.showLoader = true;
            else if (event instanceof RouteConfigLoadEnd)
                this.showLoader = false;
        })
    }

    getRouteAnimationData() {
        return this.ctx.getContext('primary')?.route?.snapshot?.data?.['animation'];
    }

    protected readonly routingAnimation = routingAnimation;
}
