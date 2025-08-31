import {routes} from "../../app.routes";
import {Component, OnInit} from "@angular/core";
import {
    ChildrenOutletContexts,
    RouteConfigLoadEnd,
    RouteConfigLoadStart,
    Router,
    RouterOutlet, Routes
} from "@angular/router";
import {WindowComponent} from "../window/window.component";
import {MenuComponent} from "./menu/menu.component";
import {animate, animateChild, group, query, style, transition, trigger} from "@angular/animations";
import {Wallet} from "wallet-sensitive/dist";

const getStateNames = (routes: Routes): string[] => {
    const stateNames: Set<string> = new Set();

    const traverseRoutes = (routes: Routes) => {
        routes.forEach(route => {
            if (route.data && route?.data?.["animation"]) {
                stateNames.add(route?.data?.["animation"]);
            }

            if (route.children && Array.isArray(route.children)) {
                traverseRoutes(route.children);
            }
        });
    };

    traverseRoutes(routes);
    return Array.from(stateNames);
};

const stateNames = getStateNames(routes);

@Component({
    selector: "app-wallet",
    standalone: true,
    imports: [
        RouterOutlet,
        MenuComponent
    ],
    animations: [
        trigger("routeAnimations", [
            ...stateNames.flatMap((state, index) =>
                stateNames.slice(index + 1).map(otherState =>
                    transition(`${state} <=> ${otherState}`, [
                        query(':enter, :leave', [
                            style({
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: "100%"
                            })
                        ], {optional: true}),
                        query(":enter", [
                            style({opacity: 0})
                        ], {optional: true}),
                        query(':leave', animateChild(), {optional: true}),
                        group([
                            query(":leave", [
                                animate("200ms ease-out", style({
                                    opacity: 0
                                }))
                            ], {optional: true}),
                            query(":enter", [
                                animate("300ms ease-out", style({
                                    opacity: 1
                                }))
                            ], {optional: true})
                        ])
                    ])))
        ])
    ],
    templateUrl: "./wallet.component.html",
    styleUrl: "./wallet.component.scss"
})
export class WalletComponent implements OnInit {

    showLoader = false;

    constructor(protected _window: WindowComponent,
                private ctx: ChildrenOutletContexts,
                private router: Router) {
    }

    ngOnInit() {
        this.router.events.subscribe(event => {
            if (event instanceof RouteConfigLoadStart)
                this.showLoader = true;
            else if (event instanceof RouteConfigLoadEnd)
                this.showLoader = false;
        });
    }

    getRouteAnimationData() {
        return this.ctx.getContext('primary')?.route?.snapshot?.data?.['animation'];
    }
}
