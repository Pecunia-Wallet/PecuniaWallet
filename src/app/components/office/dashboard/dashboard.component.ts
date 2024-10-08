import {AfterViewInit, Component, HostBinding, ViewChild} from '@angular/core';
import {CurrencyConverterComponent} from "./currency-converter/currency-converter.component";
import {Ripple} from "primeng/ripple";
import {Select} from "primeng/select";
import {CurrencyMultiselectComponent} from "../../currency-multiselect/currency-multiselect.component";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {BundleService} from "../../../services/bundle.service";
import {CurrencyService} from "../../../services/currency.service";
import {AvatarComponent} from "../avatar/avatar.component";
import {ApiService} from "../../../services/api.service";
import {WindowComponent} from "../../window/window.component";
import {CoinSum, InvoiceCount, StatisticService} from "../../../services/statistic.service";
import {BaseChartDirective} from "ng2-charts";
import {
    Chart,
    ChartConfiguration,
    ChartOptions,
    LinearScale,
    LineController,
    Point,
    PointElement, Scale,
    TooltipItem
} from "chart.js";
import {doughnutConfig, dp, range, toolTipConfig} from "../../../app.config";
import BigNumber from "bignumber.js";
import {firstValueFrom, forkJoin, map, of} from "rxjs";
import {fromPromise} from "rxjs/internal/observable/innerFrom";
import {formatDate, NgIf} from "@angular/common";
import {Currency} from "../../../models/Currency";
import "chartjs-adapter-moment";
import {Tooltip, Plugin} from "chart.js";
import moment from "moment";
import {Checkbox} from "primeng/checkbox";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faSliders} from "@fortawesome/free-solid-svg-icons";
import {Dialog} from "primeng/dialog";

let lastTooltipPos: any = {};
(Tooltip.positioners as any).top = function (elements: any[]) {
    elements = elements.map(e => e.element);

    const average = (nums: number[]) => {
        return nums.reduce((n1, n2) => n1 + n2, 0) / nums.length;
    };

    const averageX = average(elements.map(e => e.x));
    const minY = elements.map(e => e.y).sort((n1, n2) => n1 - n2)[0];

    const halfTooltipHeight = (this.chart.tooltip.height ?? 0) / 2;
    const chartHeight = this.chart.chartArea.height ?? 99999;

    const pos = {
        x: averageX,
        y: Math.min(chartHeight - halfTooltipHeight, halfTooltipHeight + Math.max(20, minY))
    };
    if (pos.x && pos.y) lastTooltipPos = pos;

    return lastTooltipPos;
};

class Period {
    name: string;
    days: number;

    constructor(name: string, days: number) {
        this.name = name;
        this.days = days;
    }
}

interface Preferences {
    period?: string;
    currency?: string;
    operationSumType?: string;
    chartShowAmount?: boolean;
    chartShowCount?: boolean;
}

@Component({
    selector: 'app-dashboard',
    imports: [
        Select,
        CurrencyMultiselectComponent,
        ReactiveFormsModule,
        AvatarComponent,
        CurrencyConverterComponent,
        BaseChartDirective,
        NgIf,
        Checkbox,
        FaIconComponent,
        Dialog,
        Ripple
    ],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements AfterViewInit {

    readonly PREFERENCES_KEY = "dashboardPreferences";

    @HostBinding("class.mobile") get mobile() {
        return this._window.isMobile();
    }

    @ViewChild("converter", {read: CurrencyConverterComponent}) converter: CurrencyConverterComponent;

    afterViewInitTaskQueue: Array<() => void> = [];
    viewInitialized = false;

    readonly periods = [
        new Period("Day", 1),
        new Period("Week", 7),
        new Period("Month", 30),
        new Period("Year", 365),
        new Period("All time", Math.floor((Date.now() - Date.parse("2025-01-01")) / 86400000))
    ];

    settings = new FormGroup({
        period: new FormControl(this.periods.find(p => p.name.toLowerCase() == "day")),
        currency: new FormControl(this.currencyService.getFiatCurrencies()[0])
    });
    showSettingsDialog = false;

    name: string;

    readonly operationSumTypes = ["Received", "Pending", "Requested"];
    operationSumType = new FormControl(this.operationSumTypes[2]);
    operationSumChartData: ChartConfiguration<"doughnut", number[]>["data"] = {
        datasets: []
    };
    totalOperationSum: BigNumber;
    animateDoughnut = true;

    datePoints = new Set<number>();
    aggregateChartData: ChartConfiguration<"line", { x: number, y: number }[]>["data"] = {
        datasets: [{
            label: "Amount",
            data: null as any,
            yAxisID: "y",
            borderColor: "#536c8f"
        }, {
            label: "Number",
            data: null as any,
            yAxisID: "y1",
            type: "bar" as any,
            backgroundColor: "#81dadd",
            hoverBackgroundColor: "#6fcdd0",
        }]
    };
    aggregateCharts = new FormGroup({
        amount: new FormControl(true),
        count: new FormControl(true)
    });

    invoiceCount: InvoiceCount;

    constructor(private api: ApiService,
                private currencyService: CurrencyService,
                private statistics: StatisticService,
                protected _window: WindowComponent) {
        this.loadPreferences();
        this.api.getName().subscribe(name => this.name = name);

        const renewDatePoints = () => {
            this.aggregateChartData.datasets.forEach(s => s.data = this.getDatePoints());
        };

        const load = () => {
            renewDatePoints();
            this.renewSum();
            this.renewAggregate();
            this.renewInvoiceCount();
        };

        const renew = () => {
            this.savePreferences();
            load();
        };

        load();

        this.settings.valueChanges.subscribe(() => renew());
        this.operationSumType.valueChanges.subscribe(() => renew());
        this.aggregateCharts.get("amount")!.valueChanges.subscribe(v => {
            this.aggregateChartData.datasets[0].hidden = !v;
            this.savePreferences();
        });
        this.aggregateCharts.get("count")!.valueChanges.subscribe(v => {
            this.aggregateChartData.datasets[1].hidden = !v;
            this.savePreferences();
        });
    }

    get uid(): string {
        return "Office/Dashboard";
    }

    get doughnutSettings(): ChartOptions<"doughnut"> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        const conf = doughnutConfig;
        conf.animation = {
            animateRotate: this.animateDoughnut
        };
        conf.plugins!.tooltip!.callbacks = {
            label(item: TooltipItem<any>): string {
                const currency = ctx.settings.get("currency")!.value!;
                let am = Math
                    .max(0, item.parsed as number)
                    .toFixed(currency.decimals);
                if (ctx.isCrypto(currency)) am += ` ${currency.shortName}`;
                else am = `${currency.symbol}` + am;
                return item.dataset.label + `: ${am}`;
            }
        };
        conf.plugins!.legend!.position = "bottom";
        return conf
    }

    get lineSettings(): ChartOptions<"line"> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const ctx = this;
        return {
            responsive: true,
            interaction: {
                mode: "index",
                axis: "x",
                intersect: false
            },
            parsing: false,
            scales: {
                y: {
                    min: 0,
                    grid: {
                        color: "rgba(43,46,74,0.04)"
                    },
                    ticks: {},
                    type: "linear"

                },
                y1: {
                    position: "right",
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        stepSize: 1
                    },
                    type: "linear"
                },
                x: {
                    type: "time",
                    display: true,
                    time: {
                        unit: "hour"
                    },
                    grid: {
                        color: "rgba(43,46,74,0.04)"
                    },
                    ticks: {
                        autoSkip: true,
                        callback: function (v) {
                            if (!ctx.datePoints.has(+v)) return undefined;
                            const format = ctx.scale == "hours" ?
                                "HH:mm" : ctx.scale == "days" ? "MMM dd" : "MMM";
                            return formatDate(v, format, "en-US");
                        },
                    },
                    offset: true,
                    offsetAfterAutoskip: true
                }
            },
            datasets: {
                line: {
                    pointStyle: "circle",
                    normalized: true,
                    pointBorderWidth: 0,
                    pointRadius: 0,
                    pointBackgroundColor: "#536c8f",
                    pointBorderColor: "#fff",
                    pointHoverBorderWidth: 1,
                    pointHoverRadius: 3,
                    tension: 0.15
                }
            },
            plugins: {
                tooltip: {
                    ...toolTipConfig,
                    position: "top" as any,
                    caretPadding: 20,
                    caretSize: 0,
                    titleFont: {
                        size: 14,
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: {
                        x: 10,
                        y: 10
                    },
                    callbacks: {
                        title(tooltipItems: TooltipItem<any>[]): string | string[] | void {
                            return [...new Set(tooltipItems.map(i => {
                                const format = ctx.scale == "hours" ?
                                    "MMM dd, HH:mm" : ctx.scale == "days" ? "E, MMM dd" : "MMM, YYYY";
                                return formatDate((i.raw as any).x, format, "en-US");
                            }))];
                        },
                        label(item: TooltipItem<any>): string {
                            const monetary = item.dataset.label.toLowerCase() == "amount";

                            if (!monetary) return "Number: " + (item.raw as any).y;

                            let amount = (item.raw as any).y;
                            const currency: Currency = ctx.settings.get("currency")!.value!;

                            amount = Math
                                .max(0, amount as number)
                                .toFixed(currency.decimals);
                            if (ctx.isCrypto(currency)) amount += ` ${currency.shortName}`;
                            else amount = `${currency.symbol}` + amount;
                            return `Amount: ${amount}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        };
    }

    get linePlugins(): Plugin[] {
        return [{
            id: "verticalLine",
            afterTooltipDraw: chart => {
                const x = chart.tooltip!.caretX;
                const yAxis = (chart.scales as any).y;
                const ctx = chart.ctx;
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([5, 5]);
                ctx.moveTo(x, yAxis.top);
                ctx.lineTo(x, yAxis.bottom);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(43,46,74,0.75)';
                ctx.stroke();
                ctx.restore();
            }
        }]
    }

    getDatePoints() {
        const now = Date.now();
        const days = this.settings.get("period")!.value!.days;
        let points;
        if (days == 1) points = range(0, 25).map(i => {
            return {
                x: this.truncDate(now - (24 - i) * 3600000),
                y: 0
            }
        });
        else points = range(1, days + 1).map(i => {
            return {
                x: this.truncDate(now - (days - i) * 86400000),
                y: 0
            }
        });
        this.datePoints = new Set(points.map(p => p.x));
        return points;
    }

    truncDate(date: any) {
        return moment(date).startOf(this.scale).toDate().getTime()
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        this.afterViewInitTaskQueue.forEach(task => task());
    }

    renewSum() {
        const days = this.settings.get("period")!.value!.days;
        this.statistics.getOperationSum(this.operationSumType.value as any, days).subscribe(sum => {
            sum = JSON.parse(JSON.stringify(sum));
            const hasAnyAmount = !!sum.find(s => s?.amount && s.amount > 0);
            const dollar = (this.currencyService.findCurrencyByShortName("usd")
                ?? this.currencyService.findCurrencyByShortName("usdt"))!;
            const transferFuture = sum.map(async s => {
                s.amount = (await firstValueFrom(this.currencyService.transfer(
                    new BigNumber(s.amount), dollar, this.settings.get("currency")!.value!
                ))).toNumber();
            });
            fromPromise(Promise.all(transferFuture)).subscribe(() => {
                this.totalOperationSum = new BigNumber(sum
                    .map(s => s.amount)
                    .reduce((prev, current) => prev + current, 0));
                const data = sum.map(s => {
                    const am = s.amount;
                    if (!am) return hasAnyAmount ? 0 : -1;
                    return am;
                });
                this.operationSumChartData = {
                    datasets: [{
                        label: "Sum",
                        data: data.length > 0 ? data : this.currencyService.getCoins().map(() => -1),
                        backgroundColor: sum.length == 0 ? this.currencyService.getCoins().map(c => c.color)
                            : sum.map(s => s.coin
                                ? this.currencyService.findCoinByShortName(s.coin)?.color
                                : "#DBE4EE"),
                    }],
                    labels: sum.length == 0 ? this.currencyService.getCoins().map(c => c.fullName)
                        : sum.map(s => s.coin
                            ? this.currencyService.findCoinByShortName(s.coin)?.fullName
                            : "Unrelated")
                };
            });
        });
    }

    get scale() {
        const days = this.settings.get("period")!.value!.days;
        return days == 1 ? "hours" : days > 1 && days <= 31 ? "days" : "months";
    }

    renewAggregate() {
        const days = this.settings.get("period")!.value!.days;
        const dollar = this.currencyService.findCurrencyByShortName("usd")!;
        const currency: Currency = this.settings.get("currency")!.value!;

        this.statistics.getAggregate(this.scale, days).subscribe(aggr => {
            const set = this.aggregateChartData.datasets;
            const updatedCountData = set[1].data.map(d => ({ x: d.x, y: d.y }));

            aggr.forEach(p => {
                const dateX = this.truncDate(p.date);
                updatedCountData.forEach(d => {
                    if (d.x === dateX) {
                        d.y = p.count ?? 0;
                    }
                });
            });

            this.aggregateChartData.datasets[1].data = updatedCountData;

            const conversions$ = aggr.map(p => {
                const dateX = this.truncDate(p.date);
                if (!p.amount) {
                    return of({ x: dateX, y: 0 });
                }

                if (currency.shortName.toLowerCase() !== "usd") {
                    return this.currencyService.transfer(
                        new BigNumber(p.amount), dollar, currency
                    ).pipe(map(v => ({ x: dateX, y: v.toNumber() })));
                }

                return of({ x: dateX, y: p.amount });
            });

            forkJoin(conversions$).subscribe(data => {
                const updatedAmountData = set[0].data.map(d => ({ x: d.x, y: d.y }));

                data.forEach(p => {
                    updatedAmountData.forEach(d => {
                        if (d.x === p.x) {
                            d.y = p.y;
                        }
                    });
                });

                this.aggregateChartData.datasets[0].data = updatedAmountData;
            });
        });
    }

    renewInvoiceCount() {
        this.statistics.countInvoices(this.settings.get("period")!.value!.days)
            .subscribe(c => this.invoiceCount = c);
    }

    loadPreferences() {
        try {
            const json = localStorage.getItem(this.PREFERENCES_KEY) || "{}";

            const preferences: Preferences = JSON.parse(json);

            if (preferences.period) {
                this.settings.get("period")?.setValue(
                    this.periods.find(p => p.name == preferences.period));
            }

            if (preferences.currency) {
                this.settings.get("currency")?.setValue(
                    this.currencyService.findCurrencyByShortName(preferences!.currency)!);
            }

            if (preferences.operationSumType) {
                this.operationSumType.setValue(preferences.operationSumType);
            }

            if (preferences.chartShowAmount == false) {
                this.aggregateCharts.get("amount")!.setValue(false);
                this.aggregateChartData.datasets[0].hidden = true;
            }

            if (preferences.chartShowCount == false) {
                this.aggregateCharts.get("count")!.setValue(false);
                this.aggregateChartData.datasets[1].hidden = true;
            }
        } catch (e) {
            console.error(e);
        }
    }

    savePreferences() {
        const preferences: Preferences = {
            period: this.settings.get("period")!.value!.name,
            currency: this.settings.get("currency")!.value!.shortName,
            operationSumType: this.operationSumType.value!,
            chartShowAmount: this.aggregateCharts.get("amount")!.value!,
            chartShowCount: this.aggregateCharts.get("count")!.value!
        };
        localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    }

    protected isCrypto(currency: Currency) {
        return "color" in currency;
    }

    protected readonly dp = dp;
    protected readonly window = window;
    protected readonly document = document;
    protected readonly faSliders = faSliders;
}
