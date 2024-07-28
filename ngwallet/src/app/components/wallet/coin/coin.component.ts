import {Component, ElementRef, HostListener, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {forkJoin, map, Observable, of, skip, take} from "rxjs";
import {DatePipe, JsonPipe, NgForOf, NgIf, NgOptimizedImage, SlicePipe} from "@angular/common";
import {server} from "../../../app.config";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faArrowDown, faArrowLeft,
    faArrowRightFromBracket,
    faArrowUp,
    faClockRotateLeft,
    faDownload,
    faFileImport,
    faPaperPlane,
    faQrcode
} from "@fortawesome/free-solid-svg-icons";
import {DropdownMenuComponent, MenuItem} from "../../dropdown-menu/dropdown-menu.component";
import {faClipboard, faCopy} from "@fortawesome/free-regular-svg-icons";
import {DomSanitizer} from "@angular/platform-browser";
import {NotifyService} from "../../../services/notify.service";
import {InfiniteScrollDirective} from "ngx-infinite-scroll";
import {LoaderComponent} from "../loader/loader.component";
import {Transaction} from "../../../models/Transaction";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import {CurrencyService} from "../../../services/currency.service";
import {WalletService} from "../../../services/wallet.service";
import {saveAs} from "file-saver";
import {HttpClient} from "@angular/common/http";
import {ApplyDirective} from "../../../directives/apply.directive";
import {IdentityService} from "../../../services/identity.service";
import BigNumber from "bignumber.js";
import {WindowComponent} from "../../window/window.component";

@Component({
    selector: "app-coin",
    standalone: true,
    imports: [
        NgOptimizedImage,
        FaIconComponent,
        NgIf,
        DropdownMenuComponent,
        NgForOf,
        SlicePipe,
        DatePipe,
        InfiniteScrollDirective,
        RouterLink,
        LoaderComponent,
        JsonPipe,
        ApplyDirective
    ],
    templateUrl: "./coin.component.html",
    styleUrl: "./coin.component.scss"
})
export class CoinComponent implements OnInit {

    loading = true;

    @ViewChild("more") more: ElementRef;

    coin: Coin | undefined;
    fiat: FiatCurrency | undefined;
    coinBalance: string;
    fiatBalance: string;
    showDropdownMenu = false;
    dropdownMenuItems: MenuItem[];

    transactions: Transaction[] = [];
    transactionPageSize = 50;
    currentTransactionPage = 0;
    transactionsRemaining = true;

    constructor(private currencyService: CurrencyService,
                private wallet: WalletService,
                private route: ActivatedRoute,
                private sanitizer: DomSanitizer,
                private notify: NotifyService,
                private http: HttpClient,
                private router: Router,
                private identity: IdentityService,
                protected _window: WindowComponent) {}

    copyTxId(tx: Transaction) {
        navigator.clipboard.writeText(tx.id).then(() => {
            this.notify.notification$.next({
                title: "",
                text: this.sanitizer.bypassSecurityTrustHtml(`
                    <span style="font-weight: 500;font-size: 20px;text-align: left">
                        Transaction ID copied
                    </span>
                `),
                icon: faClipboard,
                hideAfter: 2000
            });
        });
    }

    @HostListener("document:click", ["$event"])
    onClick(event: any) {
        if (!this.more.nativeElement.contains(event.target)) {
            this.showDropdownMenu = false;
            this.more.nativeElement.classList.remove("hover");
        }
    }

    getNextTransactionsPage(
        coin: Coin, size?: number, offset?: number): Observable<Array<Transaction>> {
        if (size == undefined && offset == undefined && !this.transactionsRemaining) return of();
        return this.wallet.getTransactions(coin, {
            size: size != undefined ? size : this.transactionPageSize,
            offset: offset != undefined ? offset : this.currentTransactionPage++
        }).pipe(map(([remaining, transactions]) => {
            this.transactionsRemaining = remaining > 0;
            return transactions;
        }));
    }

    loadNextTransactionsPage(coin: Coin): Observable<void> {
        return this.getNextTransactionsPage(coin).pipe(map(transactions => {
            this.transactions.push(...transactions);
        }));
    }

    ngOnInit() {
        this.dropdownMenuItems = [
            {
                text: "Import privates",
                icon: faFileImport,
                onClick: () =>
                    this.router.navigate(["wallet/coin/import"], {
                        queryParamsHandling: "merge"
                    })
            },
            {
                text: "Export wallet",
                icon: faDownload,
                onClick: () =>
                    this.identity.proof().subscribe(proved => {
                        if (proved)
                            this.http.get(`${server}/wallet/${this.coin?.shortName}/export`, {
                                withCredentials: true,
                                responseType: "blob"
                            }).subscribe(f =>
                                saveAs(f, `Pecunia Export (${this.coin?.shortName.toUpperCase()}).txt`))
                    })
            },
            {
                text: "Log out",
                icon: faArrowRightFromBracket,
                iconColor: "#e84545",
                onClick: () => window.location.href = "/logout"
            }
        ];

        const n = this.route.snapshot.queryParamMap.get("n");
        forkJoin([
            this.currencyService.getCoins().pipe(take(1)),
            this.currencyService.getAccountCurrency().pipe(take(1))
        ]).subscribe(([coins, accountCurrency]) => {
            const coin = coins.find(coin => coin.shortName.toLowerCase() == n?.toLowerCase());
            if (!coin) throw new Error(`Bad coin param: ${n}`);
            this.coin = coin;
            this.fiat = accountCurrency;
            forkJoin([
                this.loadNextTransactionsPage(coin).pipe(take(1)),
                this.wallet.getBalance(coin).pipe(take(1))
            ]).subscribe(([_, coinBalance]) => {
                this.coinBalance = coinBalance.dp(coin.decimals).toString();
                this.currencyService.transfer(coinBalance, coin, accountCurrency)
                    .subscribe(fiatBalance => {
                        this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                        this.loading = false;
                    });

                this.wallet.onBalanceChange(coin).pipe(skip(1)).subscribe(balance => {
                    this.currencyService.transfer(balance, coin, accountCurrency).pipe(take(1))
                        .subscribe((fiatBalance) => {
                            this.coinBalance = balance.dp(coin.decimals).toString();
                            this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                        });
                    this.getNextTransactionsPage(coin, -1, 0).pipe(take(1))
                        .subscribe(txs => this.transactions = [...txs]);
                });
                this.currencyService.rates$.subscribe(rates => {
                    this.currencyService.transfer(new BigNumber(this.coinBalance),
                        coin, accountCurrency).pipe(take(1)).subscribe(fiatBalance => {
                        this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                    })
                })
            });
        });
    }

    toggleDropdown() {
        this.showDropdownMenu = !this.showDropdownMenu;
    }

    protected readonly server = server;
    protected readonly faArrowUp = faArrowUp;
    protected readonly faArrowDown = faArrowDown;
    protected readonly faQrcode = faQrcode;
    protected readonly faDownload = faDownload;
    protected readonly faCopy = faCopy;
    protected readonly take = take;
    protected readonly faPaperPlane = faPaperPlane;
    protected readonly faClockRotateLeft = faClockRotateLeft;
    protected readonly faArrowLeft = faArrowLeft;
}
