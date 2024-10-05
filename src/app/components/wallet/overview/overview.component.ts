import {Component, HostBinding, OnInit} from "@angular/core";
import {BaseChartDirective} from "ng2-charts";
import {ChartConfiguration, ChartOptions, TooltipItem} from "chart.js";
import {WalletService} from "../../../services/wallet.service";
import {forkJoin, map, Observable, skip, Subject, take} from "rxjs";
import {HttpClient, HttpContext} from "@angular/common/http";
import {binance, CSRF, server, sleep} from "../../../app.config";
import BigNumber from "bignumber.js";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowDown, faArrowUp, faMinus} from "@fortawesome/free-solid-svg-icons";
import {NgIf, PercentPipe} from "@angular/common";
import {CurrencyService} from "../../../services/currency.service";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import defaultCallbacks from "chart.js/dist/plugins/plugin.tooltip";
import {NgVarDirective} from "../../../directives/ng-var.directive";

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
        const ctx = this;
        return {
            locale: "en-US",
            responsive: true,
            elements: {
                arc: {
                    hoverOffset: 3
                }
            },
            animation: {
                animateRotate: this.animation
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#6a6d7f",
                        font: {
                            family: "Ubuntu",
                            size: 12,
                            weight: "lighter"
                        },
                        pointStyle: "rectRounded",
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: "#fff",
                    bodyColor: "#2b2e4a",
                    bodyFont: {
                        family: "Ubuntu",
                        size: 14,
                        weight: "lighter"
                    },
                    titleColor: "#2b2e4a",
                    titleFont: {
                        family: "Ubuntu",
                        size: 16,
                        weight: "bold"
                    },
                    boxPadding: 5,
                    displayColors: false,
                    usePointStyle: true,
                    padding: {
                        x: 20,
                        y: 10
                    },
                    borderWidth: 1,
                    borderColor: "rgba(43,46,74,0.25)",
                    callbacks: {
                        label(item: TooltipItem<any>): string {
                            return item.dataset.label + `: ${ctx.accountCurrency.symbol}${Math
                                .max(0, item.parsed as number)
                                .toFixed(ctx.accountCurrency.decimals)}`;
                        }
                    }
                }
            }
        };
    }

    coins: Coin[];
    accountCurrency: FiatCurrency;

    constructor(private wallet: WalletService,
                private currencyService: CurrencyService,
                private http: HttpClient) {}

    private getPortfolioValueChange(coins: Coin[], balances: BigNumber[]) {
        return this.http.get<Array<{
            symbol: string,
            openPrice: string | BigNumber,
            lastPrice: string | BigNumber,
            coin: Coin
        }>>(`${server}/res/statistics`, {
            context: new HttpContext().set(CSRF, false)
        }).pipe(map(changes => {
            changes.map(change => {
                change.openPrice = new BigNumber(change.openPrice);
                change.lastPrice = new BigNumber(change.lastPrice);
                const coin = coins.find(c => c.shortName.toUpperCase() == change.symbol);
                if (!coin) throw new Error("Coin not found");
                change.coin = coin;
                return change;
            });
            const [openPrice, lastPrice] = balances.map((balance, i) => {
                const change = changes.find(c => c.coin == coins[i]);
                if (!change) throw new Error("Unknown error");
                return [balance.multipliedBy(change.openPrice), balance.multipliedBy(change.lastPrice)];
            }).reduce(([a1, b1], [a2, b2]) => [a1.plus(b1), a2.plus(b2)]);
            return lastPrice.minus(openPrice).div(openPrice).dp(3, BigNumber.ROUND_HALF_UP).toNumber();
        }))
    }

    renew(start?: number): Observable<void> {
        const res = new Subject<void>();
        if (!start) start = new Date().getTime();
        forkJoin(this.coins.map(c => this.wallet.getBalance(c).pipe(take(1))))
            .subscribe(balances => {
                forkJoin([...balances.map(((balance, i) =>
                    this.currencyService.transfer(balance, this.coins[i], this.accountCurrency).pipe(take(1)))),
                ]).subscribe(fiatBalances => {
                    this.getPortfolioValueChange(this.coins, balances)
                        .subscribe(v => this.valueChange = v);
                    const delta = new Date().getTime() - (start || new Date(0).getTime());
                    setTimeout(() => {
                        this.loading = false;
                        this.chartSettings.plugins!.tooltip!.callbacks = {
                        };
                        const hasNonNullBalance = !!fiatBalances.find(balance =>
                            balance.comparedTo(new BigNumber("0")) > 0);
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
        let start = new Date().getTime();
        forkJoin([
            this.currencyService.getCoins().pipe(take(1)),
            this.currencyService.getAccountCurrency().pipe(take(1))
        ]).subscribe(async ([coins, accountCurrency]) => {
            this.coins = coins;
            this.accountCurrency = accountCurrency;

            console.log("init")
            this.renew(start);

            const silentRenew = async () => {
                this.animation = false;
                this.renew();
                await sleep(100);
                this.animation = true;
            }

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
