import {Injectable} from '@angular/core';
import {ReplaySubject, Subject} from "rxjs";
import {SafeHtml} from "@angular/platform-browser";
import {IconProp} from "@fortawesome/angular-fontawesome/types";

@Injectable({
    providedIn: 'root'
})
export class NotifyService {

    overlay$: Subject<{
        show: boolean,
        variation: "error"
    }> = new ReplaySubject();

    constructor() {}

    errorOverlay() {
        this.overlay$.next({
            show: true,
            variation: "error"
        });
    }

}
