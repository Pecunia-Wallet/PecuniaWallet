import {AfterViewInit, Component, OnInit} from "@angular/core";
import {faArrowRight} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import {CurrencyService} from "../../../services/currency.service";
import {WalletService} from "../../../services/wallet.service";
import {forkJoin, map, Observable, of, ReplaySubject, take} from "rxjs";
import BigNumber from "bignumber.js";
import {NgIf} from "@angular/common";
import {LoaderComponent} from "../loader/loader.component";
import {InputComponent} from "../../input/input.component";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {dp, getCoinName} from "../../../app.config";
import {BundleService} from "../../../services/bundle.service";
import {bindAmountChanges} from "../send-step-recipients/send-step-recipients.component";

@Component({
    selector: "app-request-builder",
    standalone: true,
    imports: [
        FaIconComponent,
        RouterLink,
        NgIf,
        LoaderComponent,
        InputComponent,
        FormsModule,
        ReactiveFormsModule,
        WalletHeaderComponent
    ],
    templateUrl: "./request-builder.component.html",
    styleUrl: "./request-builder.component.scss"
})
export class RequestBuilderComponent implements OnInit, AfterViewInit {

    loading = true;

    coin?: Coin;
    currency?: FiatCurrency;

    coinPlaceholder: string;
    currencyPlaceholder: string;

    address?: string;
    form = new FormGroup({
        amountCoins: new FormControl("", [
            Validators.required,
            control =>
                new BigNumber(control.value).gt(0) ? null : {min: true}
        ]),
        amountFiat: new FormControl(),
        label: new FormControl(),
        message: new FormControl()
    });

    viewTaskQueue = new ReplaySubject<() => void>();

    constructor(private currencyService: CurrencyService,
                private wallet: WalletService,
                private route: ActivatedRoute,
                private router: Router,
                private bundle: BundleService) {}

    get uid() {
        return `Wallet/RequestBuilder:${getCoinName(this.route)}`;
    }

    restoreState(): Observable<void> {
        const savedInstance = this.bundle.getSavedInstance(this.uid);
        const restore = this.route.snapshot.queryParamMap.get("restore") == "true";
        if (restore) {
            const amountCoins = decodeURI(
                this.route.snapshot.queryParamMap.get("amount") || "");
            this.form.get("amountCoins")!.setValue(amountCoins);
            this.form.get("label")!.setValue(decodeURI(
                this.route.snapshot.queryParamMap.get("label") || ""));
            this.form.get("message")!.setValue(decodeURI(
                this.route.snapshot.queryParamMap.get("message") || ""));
            return this.currencyService.transfer(new BigNumber(amountCoins), this.coin!, this.currency!)
                .pipe(map(amount =>
                    this.form.get("amountFiat")?.setValue(amount.toString())
                ));
        }
        if (!savedInstance || !savedInstance.restore)  return of(void 0);
        const amountCoins = savedInstance.amountCoins;
        this.form.get("amountCoins")?.setValue(amountCoins);
        this.form.get("label")?.setValue(savedInstance.label);
        this.form.get("message")?.setValue(savedInstance.message);
        return this.currencyService.transfer(new BigNumber(amountCoins), this.coin!, this.currency!)
            .pipe(map(amount =>
                this.form.get("amountFiat")?.setValue(amount.toString())
            ));
    }

    ngOnInit() {
        forkJoin([
            this.wallet.currentCoin(this.route).pipe(take(1)),
            this.currencyService.getAccountCurrency().pipe(take(1))
        ]).subscribe(([coin, currency]) => {
            this.coin = coin!;
            this.currency = currency;

            switch (coin!.shortName.toLowerCase()) {
                case "btc":
                    this.coinPlaceholder = "0.002 BTC";
                    break;
                case "ltc":
                    this.coinPlaceholder = "2 LTC";
            }
            switch (currency.shortName.toLowerCase()) {
                case "eur": // fall through
                case "usd":
                    this.currencyPlaceholder = "100 " + currency.shortName.toUpperCase();
                    break;
                case "jpy":
                    this.currencyPlaceholder = "18500 JPY";
            }

            this.address = this.route.snapshot.queryParamMap.get("addr") || undefined;
            let getAddress: Observable<string | undefined> = of(undefined);
            if (!this.address) getAddress = this.wallet.getAddress(coin!);
            forkJoin([
                getAddress.pipe(take(1)),
                this.restoreState()
            ]).subscribe(([addr]) => {
                if (addr) this.address = addr;
                this.loading = false;
            });

            this.form.valueChanges.subscribe(_ => {
                this.saveState();
            });

            this.viewTaskQueue.next(() => {
                bindAmountChanges(this.currencyService, this.form,
                    "amountCoins", "amountFiat", this.coin!, this.currency!);
                bindAmountChanges(this.currencyService, this.form,
                    "amountFiat", "amountCoins", this.currency!, this.coin!);
            });
        });
    }

    ngAfterViewInit() {
        this.viewTaskQueue.subscribe(task => {
            task()
        });
    }

    saveState(restore = true) {
        this.bundle.saveInstance(this.uid, {
            amountCoins: this.form.get("amountCoins")?.value,
            label: this.form.get("label")?.value,
            message: this.form.get("message")?.value,
            restore: restore
        });
    }

    compose() {
        if (!this.valid) return;
        this.saveState(false);

        const params: any = {
            n: this.coin!.shortName.toLowerCase(),
            amount: this.form.get("amountCoins")!.value,
            addr: this.address
        };

        const label = this.form.get("label")?.value;
        const message = this.form.get("message")?.value;
        if (label) params["label"] = encodeURIComponent(label);
        if (message) params["message"] = encodeURIComponent(message);

        for (const key of this.route.snapshot.queryParamMap.keys) {
            if (!params.hasOwnProperty(key)) params[key] = null;
        }

        this.router.navigate(["/wallet/coin/request/view"], {
            queryParams: params,
            queryParamsHandling: "merge"
        });
    }

    get valid() {
        return this.form.valid;
    }

    protected readonly Math = Math;
    protected readonly faArrowRight = faArrowRight;
}
