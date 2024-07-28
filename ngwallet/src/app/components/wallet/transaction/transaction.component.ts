import {Component, OnInit} from "@angular/core";
import {WalletComponent} from "../wallet.component";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowLeft, faArrowUpRightFromSquare} from "@fortawesome/free-solid-svg-icons";
import {DatePipe, Location, NgForOf, NgIf} from "@angular/common";
import {LoaderComponent} from "../loader/loader.component";
import {catchError, of} from "rxjs";
import {HttpErrorResponse} from "@angular/common/http";
import {Transaction} from "../../../models/Transaction";
import {Coin} from "../../../models/Coin";
import {WalletService} from "../../../services/wallet.service";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";

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
        NgForOf
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
                protected _location: Location) {}

    ngOnInit() {
        const id = this.route.snapshot.queryParamMap.get("id");
        try {
            this.wallet.currentCoin(this.route).subscribe(coin => {
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
            });
        } catch (err) {
            this.badId = true;
            this.loading = false;
        }
    }

    protected readonly faArrowLeft = faArrowLeft;
    protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
    protected readonly window = window;
}
