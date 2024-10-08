import {Component, HostBinding, OnInit} from "@angular/core";
import {BaseChartDirective} from "ng2-charts";
import {ChartConfiguration, ChartOptions, TooltipItem} from "chart.js";
import {WalletService} from "../../../services/wallet.service";
import {forkJoin, map, Observable, skip, Subject, take} from "rxjs";
import {HttpClient, HttpContext} from "@angular/common/http";
import {doughnutConfig, server, sleep} from "../../../app.config";
import BigNumber from "bignumber.js";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowDown, faArrowUp, faMinus} from "@fortawesome/free-solid-svg-icons";
import {NgIf, PercentPipe} from "@angular/common";
import {CurrencyService} from "../../../services/currency.service";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import {NgVarDirective} from "../../../directives/ng-var.directive";
import {AccountService} from "../../../services/account.service";

@Component({
    selector: "app-overview",
    standalone: true,
    imports: [
        BaseChartDirective,
        FaIconComponent,
        PercentPipe,
        NgIf,
        NgVarDirective
    ],
    templateUrl: "./overview.component.html",
    styleUrl: "./overview.component.scss"
})
export class OverviewComponent implements OnInit {

    @HostBinding("class.loading") loading = true;

    chartData: ChartConfiguration<"doughnut", number[]>["data"] = {
        datasets: []
    };
    valueChange: number = 0;

    animation = true;

    get chartSettings(): ChartOptions<"doughnut"> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        const conf = doughnutConfig;
        doughnutConfig.animation = {
            animateRotate: this.animation
        };
        doughnutConfig.plugins!.tooltip!.callbacks = {
            label(item: TooltipItem<any>): string {
                return item.dataset.label + `: ${ctx.accountCurrency.symbol}${Math
                    .max(0, item.parsed as number)
                    .toFixed(ctx.accountCurrency.decimals)}`;
            }
        };
        return conf;
    }

    coins: Coin[];
    accountCurrency: FiatCurrency;

    constructor(private wallet: WalletService,
                private currencyService: CurrencyService,
                private account: AccountService,
                private http: HttpClient) {
    }

    getPortfolioValueChange(coins: Coin[], balances: BigNumber[]) {
        return this.http.get<Array<{
            symbol: string,
            openPrice: string | BigNumber,
            lastPrice: string | BigNumber,
            coin: Coin
        }>>(`${server}/res/statistics`, {
            // context: new HttpContext().set(CSRF, false)
        }).pipe(map(changes => {
            changes.map(change => {
                change.openPrice = new BigNumber(change.openPrice);
                change.lastPrice = new BigNumber(change.lastPrice);
                const coin = this.currencyService.findCoinByShortName(change.symbol);
                if (!coin) throw new Error("Coin not found");
                change.coin = coin;
                return change;
            });
            const [openPrice, lastPrice] = balances.map((balance, i) => {
                const change = changes.find(c =>
                    c.coin.shortName.toLowerCase() == coins[i].shortName.toLowerCase());
                if (!change) throw new Error("Unknown error");
                return [balance.multipliedBy(change.openPrice), balance.multipliedBy(change.lastPrice)];
            }).reduce(([a1, b1], [a2, b2]) => [a1.plus(a2), b1.plus(b2)]);
            return lastPrice.minus(openPrice).div(openPrice).dp(3, BigNumber.ROUND_HALF_UP).toNumber();
        }))
    }

    renew(start ?: number): Observable<void> {
        const res = new Subject<void>();
        if (!start) start = new Date().getTime();
        forkJoin(this.coins.map(c => this.wallet.getBalance(c).pipe(take(1))))
            .subscribe(balances => {
                forkJoin([...balances.map(((balance, i) =>
                    this.currencyService.transfer(balance.available, this.coins[i], this.accountCurrency).pipe(take(1)))),
                ]).subscribe(fiatBalances => {
                    this.getPortfolioValueChange(this.coins, balances.map(b => b.available))
                        .subscribe(v => this.valueChange = v);
                    const delta = new Date().getTime() - (start || new Date(0).getTime());
                    setTimeout(() => {
                        this.loading = false;
                        this.chartSettings.plugins!.tooltip!.callbacks = {};
                        const hasNonNullBalance = !!fiatBalances.find(balance =>
                            balance.comparedTo(new BigNumber("0"))! > 0);
                        this.chartData = {
                            datasets: [{
                                label: "Amount",
                                data: fiatBalances.map(balance =>
                                    balance.toNumber() || (hasNonNullBalance ? 0 : -1)),
                                backgroundColor: this.coins.map(coin => coin.color),
                            }],
                            labels: this.coins.map(coin => coin.fullName)
                        };
                        res.next(void 0);
                    }, delta > 30 ? 0 : 30 - delta);
                });
            });
        return res;
    }

    ngOnInit() {
        const start = new Date().getTime();
        this.account.getAccountCurrency().pipe(take(1)).subscribe(async (accountCurrency) => {
            this.coins = this.currencyService.getCoins();
            this.accountCurrency = accountCurrency;

            this.renew(start);

            const silentRenew = async () => {
                this.animation = false;
                this.renew();
                await sleep(100);
                this.animation = true;
            };

            this.coins.forEach(coin => this.wallet.onBalanceChange(coin).pipe(skip(2))
                .subscribe(_ => {
                    if (this.loading) this.renew();
                    else silentRenew()
                }));
            let rates: any;
            this.currencyService.rates$.pipe(skip(2)).subscribe(_rates => {
                if (_rates != rates) {
                    if (this.loading) this.renew();
                    else silentRenew()
                }
                rates = _rates;
            });
        });
    }

    protected readonly Math = Math;
    protected readonly faArrowUp = faArrowUp;
    protected readonly faMinus = faMinus;
    protected readonly faArrowDown = faArrowDown;
}
