import {AfterViewInit, Component, OnDestroy, ViewChild} from "@angular/core";
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
import {dp, getCoinName} from "../../../app.config";
import {DropdownComponent, DropdownItem} from "../../dropdown/dropdown.component";
import {NgxSliderModule, Options} from "@angular-slider/ngx-slider";
import {NgIf, TitleCasePipe} from "@angular/common";
import {InputComponent} from "../../input/input.component";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faPaperPlane} from "@fortawesome/free-solid-svg-icons";
import {ApplyDirective} from "../../../directives/apply.directive";
import {IdentityService} from "../../../services/identity.service";
import {IconProp} from "@fortawesome/angular-fontawesome/types";

class FeeUnits extends DropdownItem {
    to: (feeRate: BigNumber) => string;
    from: (value: string) => BigNumber
    step: number;
}

// FIXME isn't restoring after send error

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
        TitleCasePipe
    ],
    templateUrl: "./fee-editor.component.html",
    styleUrl: "./fee-editor.component.scss"
})
export abstract class FeeEditorComponent implements AfterViewInit, OnDestroy {

    readonly bitcoinFeeUnits: FeeUnits[] = [
        {
            text: "sat/vByte", step: .01,
            to: (r: BigNumber) => dp(r.times(1e8).div(1000), 2),
            from: (v: string) => new BigNumber(v).div(1e8).times(1000)
        },
        {
            text: "sat/vKbyte", step: 100,
            to: (r: BigNumber) => dp(r.times(1e8), 0),
            from: (v: string) => new BigNumber(v).div(1e8)
        },
        {
            text: "BTC/vByte", step: 0.00000001,
            to: (r: BigNumber) => dp(r.div(1000), 8),
            from: (v: string) => new BigNumber(v).times(1000)
        },
        {
            text: "BTC/vKbyte", step: 1e-8,
            to: (r: BigNumber) => dp(r, 8),
            from: (v: string) => new BigNumber(v)
        }
    ].map(conf => Object.assign(new FeeUnits(), conf));

    readonly bitcoinMinFee: number = 1e-5;
    readonly bitcoinMaxFee: number = 1e-3;
    readonly bitcoinDefaultFee: number = 4e-4;

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

    constructor(protected broker: BrokerService,
                protected bundle: BundleService,
                protected wallet: WalletService,
                protected route: ActivatedRoute,
                protected router: Router,
                protected id: IdentityService) {
    }

    abstract get uid(): string;

    abstract confirm(): void;
    abstract get action(): string;
    abstract get link(): string;
    abstract get icon(): IconProp;
    abstract get askSubtraction(): boolean;

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
        this.feeUnits = savedInstance?.feeUnits || this.availableFeeUnits[0];
        return true;
    }

    saveState() {
        this.bundle.saveInstance(this.uid, {
            feePerKb: this.feePerKb,
            feeUnits: this.feeUnits,
            inputValue: this.feeInUnits,
            recipientsPayFees: this.recipientsPayFees
        });
    }

    ngAfterViewInit() {
        this.wallet.currentCoin(this.route).subscribe(coin => {
            this.coin = coin!;
            this.wallet.getFeeEstimates(coin!).subscribe(est => {
                this.estimates = est
                    .sort((e1, e2) => e2.blocks - e1.blocks);

                switch (coin!.shortName.toLowerCase()) {
                    case "btc":
                        this.availableFeeUnits = this.bitcoinFeeUnits;
                        this.minFee = this.bitcoinMinFee;
                        this.maxFee = this.bitcoinMaxFee;
                        this.feePerKb = Math.min(this.bitcoinDefaultFee,
                            est[est.length - 1].feeRate.toNumber());
                        break;
                }

                this.restoreState();

                this._rawSliderOptions = this.rawSliderOptions;
                this._blocksSliderOptions = this.blocksSliderOptions;
                this.prevFeeUnits = this.feeUnits;

                this.setBlocksFromFee();

                this.initializing = false;
            });
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
            if (estimate.feeRate.comparedTo(this.feePerKb) <= 0)
                result = i;
        }
        this.blocks = result;
    }

    setFeeFromBlocks() {
        this.feePerKb = this.estimates[this.blocks].feeRate.toNumber();
    }

    get rawSliderOptions(): Options {
        if (!this.estimates) return null as unknown as Options;
        const step = 1 / Math.pow(10, this.coin.decimals);
        return {
            floor: this.minFee,
            ceil: this.maxFee,
            translate: value => this.feeUnits.to(new BigNumber(value)),
            showSelectionBar: true,
            step: step,
            disabled: this.loading
        };
    }

    get blocksSliderOptions(): Options {
        if (!this.estimates) return null as unknown as Options;
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
