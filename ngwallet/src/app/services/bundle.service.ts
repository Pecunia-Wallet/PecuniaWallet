import {Injectable} from "@angular/core";

@Injectable({
    providedIn: "root"
})
export class BundleService {

    private _saved = new Map<string, any>();

    constructor() {}

    getSavedInstance(uid: string): any | null {
        return this._saved.get(uid) || null;
    }

    saveInstance(uid: string, state: any) {
        this._saved.set(uid, state);
    }

}
