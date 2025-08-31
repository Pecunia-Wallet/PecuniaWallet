import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {LoaderComponent} from "../loader/loader.component";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {CheckboxComponent} from "../../checkbox/checkbox.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrokerService} from "../../../services/broker.service";
import {BundleService} from "../../../services/bundle.service";
import {FeeEstimate, WalletService} from "../../../services/wallet.service";
import {Coin} from "../../../models/Coin";
import {ActivatedRoute, Router} from "@angular/router";
import BigNumber from "bignumber.js";
import {dp} from "../../../app.config";
import {DropdownComponent, DropdownItem} from "../../dropdown/dropdown.component";
import {NgxSliderModule, Options} from "@angular-slider/ngx-slider";
import {NgIf, TitleCasePipe} from "@angular/common";
import {InputComponent} from "../../input/input.component";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ApplyDirective} from "../../../directives/apply.directive";
import {IdentityService} from "../../../services/identity.service";
import {IconProp} from "@fortawesome/angular-fontawesome/types";
import {Select} from "primeng/select";
import {log} from "@angular-devkit/build-angular/src/builders/ssr-dev-server";
import {CurrencyService} from "../../../services/currency.service";

class FeeUnits extends DropdownItem {
    to: (feeRate: BigNumber) => string;
    from: (value: string) => BigNumber;
    step: number;
}

// FIXME isn't restoring after send error

const generateBitcoinLikeUnits = (coin: Coin) => [
    {
        text: `${coin.unitName.toLowerCase()}/vByte`, step: .01,
        to: (r: BigNumber) => dp(r.times(1e8).div(1000), 2),
        from: (v: string) => new BigNumber(v).div(1e8).times(1000)
    },
    {
        text: `${coin.unitName.toLowerCase()}/vKbyte`, step: 100,
        to: (r: BigNumber) => dp(r.times(1e8), 0),
        from: (v: string) => new BigNumber(v).div(1e8)
    },
    {
        text: `${coin.shortName.toUpperCase()}/vByte`, step: 0.00000001,
        to: (r: BigNumber) => dp(r.div(1000), 8),
        from: (v: string) => new BigNumber(v).times(1000)
    },
    {
        text: `${coin.shortName.toUpperCase()}/vKbyte`, step: 1e-8,
        to: (r: BigNumber) => dp(r, 8),
        from: (v: string) => new BigNumber(v)
    }
].map(conf => Object.assign(new FeeUnits(), conf));

@Component({
    selector: "app-fee-editor",
    standalone: true,
    imports: [
        LoaderComponent,
        WalletHeaderComponent,
        CheckboxComponent,
        FormsModule,
        ReactiveFormsModule,
        DropdownComponent,
        NgxSliderModule,
        NgIf,
        InputComponent,
        FaIconComponent,
        ApplyDirective,
        TitleCasePipe,
        Select
    ],
    templateUrl: "./fee-editor.component.html",
    styleUrl: "./fee-editor.component.scss"
})
export abstract class FeeEditorComponent implements OnInit, AfterViewInit, OnDestroy {

    readonly bitcoinMinFee: number = 0.00001;
    readonly bitcoinMaxFee: number = 0.001;
    readonly bitcoinDefaultFee: number = 0.0003;
    readonly litecoinMinFee: number = 0.00001;
    readonly litecoinMaxFee: number = 0.001;
    readonly litecoinDefaultFee: number = 0.0003;

    bitcoinFeeUnits: FeeUnits[];
    litecoinFeeUnits: FeeUnits[];

    @ViewChild("checkbox") checkbox: CheckboxComponent;

    initializing = true;
    loading = false;

    coin: Coin;
    estimates: FeeEstimate[];

    feePerKb: number;
    blocks: number;
    recipientsPayFees = false;
    feeInUnits: string;

    minFee: number;
    maxFee: number;
    availableFeeUnits: FeeUnits[];
    feeUnits: FeeUnits;
    prevFeeUnits: FeeUnits;

    _rawSliderOptions: Options;
    _blocksSliderOptions: Options;

    protected constructor(currencyService: CurrencyService,
                          protected broker: BrokerService,
                          protected bundle: BundleService,
                          protected wallet: WalletService,
                          protected route: ActivatedRoute,
                          protected router: Router,
                          protected id: IdentityService) {
        const bitcoin = currencyService.findCoinByShortName("BTC");
        const litecoin = currencyService.findCoinByShortName("LTC");
        if (bitcoin) {
            this.bitcoinFeeUnits = generateBitcoinLikeUnits(bitcoin);
        }
        if (litecoin) {
            this.litecoinFeeUnits = generateBitcoinLikeUnits(litecoin);
        }
    }

    abstract get uid(): string;

    abstract confirm(): void;

    abstract get action(): string;

    abstract get link(): string;

    abstract get icon(): IconProp;

    abstract get askSubtraction(): boolean;

    ngOnInit() {
        this.coin = this.wallet.currentCoin(this.route)!;
        switch (this.coin!.shortName.toLowerCase()) {
            case "btc":
                this.availableFeeUnits = this.bitcoinFeeUnits;
                break;
            case "ltc":
                this.availableFeeUnits = this.litecoinFeeUnits;
                break;
        }
    }

    restoreState(): boolean {
        let savedInstance = this.bundle.getSavedInstance(this.uid);
        if (this.uid.startsWith("Wallet/Send") && this.broker.data.send?.preventRestore)
            savedInstance = null;
        if (this.uid.startsWith("Wallet/Import") && this.broker.data.import?.preventRestore)
            savedInstance = null;
        this.feePerKb = savedInstance?.feePerKb || this.feePerKb;
        this.feeInUnits = savedInstance?.inputValue || "";
        this.recipientsPayFees = false;
        if (savedInstance?.recipientsPayFees) {
            this.checkbox.setValueBypassAnimation(true);
            this.recipientsPayFees = true;
        }
        this.feeUnits = this.availableFeeUnits[savedInstance?.feeUnits || 0];
        return true;
    }

    saveState() {
        this.bundle.saveInstance(this.uid, {
            feePerKb: this.feePerKb,
            feeUnits: this.availableFeeUnits.indexOf(this.feeUnits),
            inputValue: this.feeInUnits,
            recipientsPayFees: this.recipientsPayFees
        });
    }

    ngAfterViewInit() {
        this.wallet.getFeeEstimates(this.coin!).subscribe(est => {
            this.estimates = est
                .sort((e1, e2) => e2.blocks - e1.blocks);

            switch (this.coin!.shortName.toLowerCase()) {
                case "btc":
                    this.minFee = this.bitcoinMinFee;
                    this.maxFee = this.bitcoinMaxFee;
                    this.feePerKb = Math.min(this.bitcoinDefaultFee,
                        est[Math.ceil(est.length / 2)].feeRate.toNumber());
                    break;
                case "ltc":
                    this.minFee = this.litecoinMinFee;
                    this.maxFee = this.litecoinMaxFee;
                    this.feePerKb = Math.min(this.litecoinDefaultFee,
                        est[Math.ceil(est.length / 2)].feeRate.toNumber());
                    break;
            }
            this.restoreState();

            this._rawSliderOptions = this.rawSliderOptions;
            this._blocksSliderOptions = this.blocksSliderOptions;
            this.prevFeeUnits = this.feeUnits;

            this.setBlocksFromFee();

            this.initializing = false;
        });
    }

    ngOnDestroy() {
        this.saveState();
    }

    applyFee() {
        let feePerKb = this.feeUnits.from(this.feeInUnits).toNumber();
        if (!feePerKb) return;
        if (feePerKb > this._rawSliderOptions.ceil!) feePerKb = this._rawSliderOptions.ceil!;
        if (feePerKb < this._rawSliderOptions.floor!) feePerKb = this._rawSliderOptions.floor!;
        this.feePerKb = feePerKb;
        this.feeInUnits = this.feeUnits.to(new BigNumber(feePerKb));
        this.setBlocksFromFee();
    }

    setBlocksFromFee() {
        let result = 0;
        for (let i = 0; i < this.estimates.length; i++) {
            const estimate = this.estimates[i];
            if (estimate.feeRate.comparedTo(this.feePerKb)! <= 0)
                result = i;
        }
        this.blocks = result;
    }

    setFeeFromBlocks() {
        this.feePerKb = this.estimates[this.blocks].feeRate.toNumber();
    }

    get rawSliderOptions(): Options {
        if (!this.estimates) return null as any;
        const step = 1 / Math.pow(10, this.coin.decimals);
        return {
            floor: this.minFee,
            ceil: this.maxFee,
            translate: value => this.feeUnits.to(new BigNumber(value)),
            showSelectionBar: true,
            step: step,
            disabled: this.loading,
            logScale: true
        };
    }

    get blocksSliderOptions(): Options {
        if (!this.estimates) return null as any;
        return {
            floor: 0,
            ceil: this.estimates.length - 1,
            showTicks: true,
            showSelectionBar: true,
            disabled: this.loading,
            getLegend: v => v == 0 ? "Slow" : v == this.estimates.length - 1 ? "Quick" : "",
            translate: v => this.estimates[v].blocks.toString()
        };
    }

    renewSliders() {
        const ariaLabel = this._rawSliderOptions.ariaLabel == "" ? undefined : "";
        this._rawSliderOptions = Object.assign(this.rawSliderOptions, {
            ariaLabel: ariaLabel
        });
        this._blocksSliderOptions = Object.assign(this.blocksSliderOptions, {
            ariaLabel: ariaLabel
        });
    }

    feeUnitsChange() {
        this.renewSliders();
        this.feeInUnits = this.feeUnits.to(this.prevFeeUnits.from(this.feeInUnits));
        this.prevFeeUnits = this.feeUnits;
    }

    protected readonly BigNumber = BigNumber;
}
