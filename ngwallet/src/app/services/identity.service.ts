import {Injectable} from "@angular/core";
import {mergeWith, Observable, ReplaySubject, Subject, take, tap} from "rxjs";
import {Router} from "@angular/router";
import {fromPromise} from "rxjs/internal/observable/innerFrom";

@Injectable({
    providedIn: "root"
})
export class IdentityService {

    proved$ = new Subject<boolean>();
    approvalRequested$ = new Subject<boolean>();

    private _approvalRequested: boolean;

    constructor(private router: Router) {
        window.addEventListener("hashchange", () => {
            if (window.location.hash != "#id") {
                this.approvalRequested$.next(false);
                this.proved$.next(false);
            }
        });
    }

    get approvalRequested(): boolean {
        return this._approvalRequested;
    }

    proof(): Observable<boolean> {
        this.approvalRequested$.next(true);
        window.location.hash = "id";
        return this.proved$.pipe(take(1), tap(proved => {
            if (proved) this.approvalRequested$.next(false);
        }));
    }

}
