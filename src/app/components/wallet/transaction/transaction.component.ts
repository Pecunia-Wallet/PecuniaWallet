import {Component, OnInit} from "@angular/core";
import {WalletComponent} from "../wallet.component";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowLeft, faArrowUpRightFromSquare, faEye} from "@fortawesome/free-solid-svg-icons";
import {faCopy} from "@fortawesome/free-regular-svg-icons";
import {DatePipe, Location, NgForOf, NgIf} from "@angular/common";
import {LoaderComponent} from "../loader/loader.component";
import {catchError, of} from "rxjs";
import {HttpErrorResponse} from "@angular/common/http";
import {Transaction} from "../../../models/Transaction";
import {Coin} from "../../../models/Coin";
import {WalletService} from "../../../services/wallet.service";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {CircleProgressComponent} from "../../circle-progress/circle-progress.component";
import {HotToastService} from "@ngxpert/hot-toast";

@Component({
    selector: 'app-transaction',
    standalone: true,
    imports: [
        FaIconComponent,
        DatePipe,
        RouterLink,
        LoaderComponent,
        NgIf,
        WalletHeaderComponent,
        NgForOf,
        CircleProgressComponent
    ],
    templateUrl: './transaction.component.html',
    styleUrl: './transaction.component.scss'
})
export class TransactionComponent implements OnInit {

    loading = true;
    tx: Transaction | undefined;
    coin: Coin | undefined;
    badId = false;

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private toast: HotToastService,
                protected _location: Location) {
    }

    ngOnInit() {
        const id = this.route.snapshot.queryParamMap.get("id");
        try {
            const coin = this.wallet.currentCoin(this.route);
            if (!coin || !id) return this._location.back();
            this.coin = coin;
            this.wallet.getTransaction(coin, id).pipe(catchError(() => {
                this.badId = true;
                this.loading = false;
                return of();
            })).subscribe(tx => {
                this.badId = false;
                this.tx = tx;
                this.loading = false;
            });
        } catch (err) {
            this.badId = true;
            this.loading = false;
        }
    }

    signum(v?: BigNumber): "+" | "-" | "" {
        if (!v) return "";
        return v.isPositive() ? "+" : v.isNegative() ? "-" : "";
    }

    copyId() {
        if (!this.tx) return;
        window.navigator.clipboard.writeText(this.tx!.id).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `tx${this.tx!.id}IdCopied`
            });
        });
    }

    copyAddresses() {
        if (!this.tx) return;
        const addresses = this.tx.addresses.join(", ");
        window.navigator.clipboard.writeText(addresses).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `tx${this.tx!.id}AddressesCopied`
            });
        });
    }

    protected readonly faArrowLeft = faArrowLeft;
    protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
    protected readonly window = window;
    protected readonly Math = Math;
    protected readonly faCopy = faCopy;
    protected readonly faEye = faEye;
}
