import {ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {forkJoin, map, Observable, of, skip, Subject, take, takeUntil} from "rxjs";
import {DatePipe, NgForOf, NgIf, NgOptimizedImage, SlicePipe} from "@angular/common";
import {dp, server} from "../../../app.config";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faArrowDown, faArrowLeft, faArrowRightArrowLeft,
    faArrowRightFromBracket,
    faArrowUp, faArrowUpFromBracket,
    faClockRotateLeft, faHeadset,
    faLock,
    faPaperPlane, faPlus,
    faRotate, faShuffle
} from "@fortawesome/free-solid-svg-icons";
import {DropdownMenuComponent, MenuItem} from "../../dropdown-menu/dropdown-menu.component";
import {faCopy} from "@fortawesome/free-regular-svg-icons";
import {InfiniteScrollDirective} from "ngx-infinite-scroll";
import {LoaderComponent} from "../loader/loader.component";
import {Transaction} from "../../../models/Transaction";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import {CurrencyService} from "../../../services/currency.service";
import {WalletService} from "../../../services/wallet.service";
import {IdentityService} from "../../../services/identity.service";
import BigNumber from "bignumber.js";
import {WindowComponent} from "../../window/window.component";
import {AuthService} from "../../../services/auth.service";
import {HotToastService} from "@ngxpert/hot-toast";
import {Ripple} from "primeng/ripple";
import {Balance} from "wallet-sensitive/dist";
import {AccountService} from "../../../services/account.service";

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
        Ripple
    ],
    templateUrl: "./coin.component.html",
    styleUrl: "./coin.component.scss"
})
export class CoinComponent implements OnInit, OnDestroy {

    loading = true;

    @ViewChild("more") more: ElementRef;

    coin: Coin | undefined;
    fiat: FiatCurrency | undefined;
    balance: Balance;
    hasUnconfirmed: boolean;
    fiatBalance: string;
    showDropdownMenu = false;
    dropdownMenuItems: MenuItem[];

    transactions: Transaction[] = [];
    transactionPageSize = 20;
    currentTransactionPage = 0;
    transactionsRemaining = true;

    private destroy$ = new Subject<void>();

    constructor(private currencyService: CurrencyService,
                private wallet: WalletService,
                private route: ActivatedRoute,
                private router: Router,
                private account: AccountService,
                private identity: IdentityService,
                private auth: AuthService,
                private ref: ChangeDetectorRef,
                private toast: HotToastService,
                protected _window: WindowComponent) {
    }

    copyTxId(tx: Transaction) {
        navigator.clipboard.writeText(tx.id).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `tx${tx.id}IdCopied`
            });
        });
    }

    @HostListener("document:click", ["$event"])
    onClick(event: any) {
        if (!this.more.nativeElement?.contains(event.target)) {
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
            // transactions.map(tx => tx.time.)
            this.transactions.push(...transactions);
        }));
    }

    ngOnInit(first = true) {
        this.dropdownMenuItems = [
            // TODO temporary disabled
            // {
            //     text: "Import keys",
            //     icon: faPlus,
            //     onClick: () =>
            //         this.router.navigate(["wallet/coin/keys"], {
            //             queryParamsHandling: "merge"
            //         })
            // },
            {
                text: "Export keys",
                icon: faArrowUpFromBracket,
                onClick: () =>
                    this.identity.proof().subscribe(proved => {
                        if (proved) {
                            // this.wallet.export(this.coin!);
                            this.router.navigate(["/wallet/coin/export"], {
                                queryParamsHandling: "merge",
                                state: {requested: true}
                            });
                        }
                    })
            },
            {
                text: "Lock wallet",
                icon: faLock,
                onClick: () => {
                    this.auth.clear();
                    this.router.navigate(["/unlock"]);
                }
            },
            {
                text: "Support",
                icon: faHeadset,
                onClick: () => {
                    window.open("https://pecuniawallet.com/about/support", "_blank");
                }
            },
            {
                text: "Log out",
                icon: faArrowRightFromBracket,
                iconColor: "#e84545",
                onClick: () => this.auth.logout()
            }
        ];

        const n = this.route.snapshot.queryParamMap.get("n");

        this.account.getAccountCurrency().pipe(take(1)).subscribe((accountCurrency) => {
            const coins = this.currencyService.getCoins();
            const coin = coins.find(coin => coin.shortName.toLowerCase() == n?.toLowerCase());
            if (!coin) throw new Error(`Bad coin param: ${n}`);
            this.coin = coin;
            this.fiat = accountCurrency;
            forkJoin([
                this.loadNextTransactionsPage(coin).pipe(take(1)),
                this.wallet.getBalance(coin).pipe(take(1))
            ]).subscribe(([_, coinBalance]) => {
                this.balance = coinBalance;
                this.hasUnconfirmed = coinBalance.unconfirmed.gt(new BigNumber("0"));
                this.currencyService.transfer(coinBalance.available, coin, accountCurrency)
                    .subscribe(fiatBalance => {
                        this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                        this.loading = false;
                    });

                this.wallet.onBalanceChange(coin).subscribe(balance => {
                    this.currencyService.transfer(balance.available, coin, accountCurrency).pipe(take(1))
                        .subscribe((fiatBalance) => {
                            this.balance = balance;
                            this.hasUnconfirmed = coinBalance.unconfirmed.gt(new BigNumber("0"));
                            this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                        });
                    this.getNextTransactionsPage(coin, -1, 0).pipe(take(1))
                        .subscribe(txs => {
                            this.transactions = [...txs];
                            this.ref.detectChanges();
                        });
                });
                this.currencyService.rates$.subscribe(() => {
                    this.currencyService.transfer(new BigNumber(this.balance.available),
                        coin, accountCurrency).pipe(take(1)).subscribe(fiatBalance => {
                        this.fiatBalance = fiatBalance.toFixed(accountCurrency.decimals);
                    })
                })
            });
        });

        if (!first) return;
        let coin = this.route.snapshot.queryParamMap.get("n");
        this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                if (params["n"] !== coin) {
                    coin = params["n"];
                    this.loading = true;

                    this.more = undefined as unknown as any;

                    this.coin = undefined;
                    this.fiat = undefined;
                    this.balance = undefined as unknown as any;
                    this.hasUnconfirmed = false;
                    this.fiatBalance = undefined as unknown as any;
                    this.showDropdownMenu = false;
                    this.dropdownMenuItems = undefined as unknown as any;

                    this.transactions = [];
                    this.currentTransactionPage = 0;
                    this.transactionsRemaining = true;
                    this.ngOnInit(false);
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggleDropdown() {
        this.showDropdownMenu = !this.showDropdownMenu;
    }

    isReliable(tx: Transaction) {
        return tx.confirmations >= this.coin!.requiredConfirmations;
    }

    protected readonly server = server;
    protected readonly faArrowUp = faArrowUp;
    protected readonly faArrowDown = faArrowDown;
    protected readonly faCopy = faCopy;
    protected readonly take = take;
    protected readonly faPaperPlane = faPaperPlane;
    protected readonly faClockRotateLeft = faClockRotateLeft;
    protected readonly faArrowLeft = faArrowLeft;
    protected readonly faRotate = faRotate;
    protected readonly faArrowRightArrowLeft = faArrowRightArrowLeft;
    protected readonly faShuffle = faShuffle;
    protected readonly dp = dp;
}
