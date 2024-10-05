import {Component, ElementRef, OnInit} from "@angular/core";
import {WalletService} from "../../../services/wallet.service";
import {WindowComponent} from "../../window/window.component";
import {BehaviorSubject, first, forkJoin} from "rxjs";
import BigNumber from "bignumber.js";
import {server, range} from "../../../app.config";
import {FiatSelectorComponent} from "../../fiat-selector/fiat-selector.component";
import {FloatBarComponent} from "../../window/float-bar/float-bar.component";
import {NgForOf, NgOptimizedImage} from "@angular/common";
import {OverviewComponent} from "../overview/overview.component";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {CurrencyService} from "../../../services/currency.service";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import { Rate } from "../../../models/Rate";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCashRegister} from "@fortawesome/free-solid-svg-icons";

interface CoinButton {
    coin: Coin;
    fiat: FiatCurrency;
    coinBalance: BigNumber;
    fiatBalance: BigNumber;
}

@Component({
    selector: "app-menu",
    standalone: true,
    imports: [
        FiatSelectorComponent,
        FloatBarComponent,
        NgForOf,
        NgOptimizedImage,
        OverviewComponent,
        RouterLink,
        FaIconComponent
    ],
    templateUrl: "./menu.component.html",
    styleUrl: "./menu.component.scss"
})
export class MenuComponent implements OnInit {

    coinButtons: CoinButton[];
    coins: Coin[] = [];
    accountCurrency: FiatCurrency;

    constructor(protected currencyService: CurrencyService,
                protected wallet: WalletService,
                protected ref: ElementRef,
                protected _window: WindowComponent,
                protected route: ActivatedRoute) {
    }

    renew() {
        const res$ = new BehaviorSubject<Array<CoinButton>>([]);
        this.coins.forEach(coin => this.wallet
            .getBalance(coin)
            .subscribe(balance => {
                this.currencyService.transfer(balance, coin, this.accountCurrency)
                    .subscribe(fiatBalance => res$.next([
                        ...res$.value,
                        {
                            coin: coin,
                            fiat: this.accountCurrency,
                            coinBalance: balance,
                            fiatBalance: fiatBalance
                        }
                    ]));
            }));
        res$.subscribe(res => {
            if (res.length == this.coins.length) {
                this.coinButtons = res;
                this.ref.nativeElement.querySelectorAll(".placeholders")
                    .forEach((placeholder: any) => setTimeout(() => placeholder.remove(), 350));
            }
        });
    }

    ngOnInit() {
        forkJoin([
            this.currencyService.getCoins().pipe(first()),
            this.currencyService.getAccountCurrency().pipe(first())
        ]).subscribe(([coins, accountCurrency]) => {
            this.coins = coins;
            this.accountCurrency = accountCurrency;
            forkJoin(coins.map(coin => this.wallet.getBalance(coin))).subscribe(_ => {
                coins.forEach(coin => this.wallet.onBalanceChange(coin).subscribe(() => this.renew()));
                this.renew();
            });
            let rates: Rate[] | null = null;
            this.currencyService.rates$.subscribe(_rates => {
                if (!rates || rates != _rates) this.renew();
                rates = _rates;
            })
        });
    }

    protected readonly server = server;
    protected readonly range = range;
    protected readonly faCashRegister = faCashRegister;
}
