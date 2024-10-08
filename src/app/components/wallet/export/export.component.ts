import {Component} from '@angular/core';
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {WalletService} from "../../../services/wallet.service";
import {WalletExport} from "wallet-sensitive/dist";
import {ActivatedRoute} from "@angular/router";
import {retry} from "rxjs";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCopy, faEye, faEyeSlash, faTrashCan, faWarning} from "@fortawesome/free-solid-svg-icons";
import {NgIf, UpperCasePipe} from "@angular/common";
import {Coin} from "../../../models/Coin";
import {HotToastService} from "@ngxpert/hot-toast";
import {ConfirmPopup} from "primeng/confirmpopup";
import {ConfirmationService} from "primeng/api";

@Component({
    selector: 'app-export',
    imports: [
        WalletHeaderComponent,
        FaIconComponent,
        NgIf,
        UpperCasePipe,
        ConfirmPopup
    ],
    providers: [
        ConfirmationService
    ],
    templateUrl: './export.component.html',
    styleUrl: './export.component.scss'
})
export class ExportComponent {

    export?: WalletExport & {keys: Array<{show: boolean}>};
    coin: Coin;

    constructor(private wallet: WalletService,
                private toast: HotToastService,
                private confirm: ConfirmationService,
                route: ActivatedRoute) {
        this.coin = this.wallet.currentCoin(route)!;
        this.wallet.export(this.coin).pipe(retry(1)).subscribe(e => {
            e.keys?.forEach((k: any) => {
                k.show = false;
            });
            if (!e.keys) e.keys = [];
            this.export = e as any;
        });
    }

    censorKey(key: string) {
        return key.substring(0, 2) + "*".repeat(key.length - 4) + key.substring(key.length - 2)
    }

    copy(value: string, id: string) {
        window.navigator.clipboard.writeText(value).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `${id}${value}`
            });
        })
    }

    protected readonly faCopy = faCopy;
    protected readonly faEye = faEye;
    protected readonly faEyeSlash = faEyeSlash;
    protected readonly faTrashCan = faTrashCan;
    protected readonly faWarning = faWarning;
}
