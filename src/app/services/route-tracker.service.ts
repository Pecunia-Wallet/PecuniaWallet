import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {convertQueryStringToObject} from "../app.config";

@Injectable({
    providedIn: 'root'
})
export class RouteTrackerService {

    private static GENERAL_ROUTES: string[] = ["wallet", "office"];

    private static NAMED_ROUTES: { [name: string]: string} = {
        office: "office",
        wallet: "wallet"
    };

    constructor(private router: Router) {
        this.router.events
            .pipe(filter(e => {
                return e instanceof NavigationEnd
            }))
            .subscribe(this.handleNavigation);
    }

    private handleNavigation(event: NavigationEnd) {
        const urlLower = event.urlAfterRedirects.toLowerCase();
        const [pathRaw, queryParams] = urlLower.split("?");
        const path = pathRaw.replace(/^\//, "")

        if (RouteTrackerService.GENERAL_ROUTES.some(r => path.startsWith(r))) {
            localStorage.setItem("lastVisitedRoute", pathRaw);
            if (queryParams) {
                localStorage.setItem('lastVisitedQueryParams', queryParams);
            }
        }

        Object.keys(RouteTrackerService.NAMED_ROUTES).forEach(name => {
            const prefix = RouteTrackerService.NAMED_ROUTES[name].toLowerCase();
            if (path.startsWith(prefix)) {
                const specificRoute = path.substring(prefix.length).replace(/^\//, '');
                const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
                localStorage.setItem(`lastVisited${capitalizedName}Route`, specificRoute);
                if (queryParams) {
                    localStorage.setItem(`lastVisited${capitalizedName}QueryParams`, queryParams);
                }
            }
        });
    }

    public getLast(key?: string): { route: string | null, queryParams: { [key: string]: any } } {
        key = key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
        const route = localStorage.getItem(`lastVisited${key}Route`) || null;
        const queryStr = localStorage.getItem(`lastVisited${key}QueryParams`);
        const query = queryStr ? convertQueryStringToObject(queryStr) : {};
        return { route, queryParams: query };
    }
}
