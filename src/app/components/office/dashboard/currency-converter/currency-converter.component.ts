import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {CurrencyService} from "../../../../services/currency.service";
import {Currency} from "../../../../models/Currency";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {InputComponent} from "../../../input/input.component";
import {CurrencyMultiselectComponent} from "../../../currency-multiselect/currency-multiselect.component";
import BigNumber from "bignumber.js";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faRightLeft} from "@fortawesome/free-solid-svg-icons";
import {Ripple} from "primeng/ripple";
import {BundleService} from "../../../../services/bundle.service";

interface Preferences {
    srcCurrency?: string,
    destCurrency?: string
}

@Component({
    selector: 'app-currency-converter',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        InputComponent,
        CurrencyMultiselectComponent,
        FaIconComponent,
        Ripple
    ],
    templateUrl: './currency-converter.component.html',
    styleUrl: './currency-converter.component.scss'
})
export class CurrencyConverterComponent implements OnInit {

    private readonly PREFERENCES_KEY = "currencyConverterPreferences";

    @Input() id: string;

    @Output() ichange = new EventEmitter();

    form = new FormGroup({
        srcAmount: new FormControl("", [Validators.required]),
        srcCurrency: new FormControl(null as any, [Validators.required]),
        destAmount: new FormControl("", [Validators.required]),
        destCurrency: new FormControl(null as any, [Validators.required]),
    });

    get srcCurrencies() {
        return this.currenciesExcluding(this.form.get("destCurrency")?.value);
    }

    get destCurrencies() {
        return this.currenciesExcluding(this.form.get("srcCurrency")?.value);
    }

    get srcAmount() {
        return this.form.get("srcAmount");
    }

    get srcCurrency() {
        return this.form.get("srcCurrency");
    }

    get destAmount() {
        return this.form.get("destAmount");
    }

    get destCurrency() {
        return this.form.get("destCurrency");
    }

    constructor(private currencyService: CurrencyService, private bundle: BundleService) {
        const autoTransfer = (srcAmount: any, srcCurrency: any, destAmount: any, destCurrency: any) => {
            srcAmount.valueChanges.subscribe(() =>
                this.transfer(srcAmount, srcCurrency, destAmount, destCurrency));
            srcCurrency.valueChanges.subscribe(() =>
                this.transfer(destAmount, destCurrency, srcAmount, srcCurrency));
        }

        autoTransfer(this.srcAmount, this.srcCurrency, this.destAmount, this.destCurrency);
        autoTransfer(this.destAmount, this.destCurrency, this.srcAmount, this.srcCurrency);
    }

    ngOnInit() {
        this.restoreState();
        this.form.valueChanges.subscribe(() => {
            this.ichange.emit();
        });
        this.ichange.subscribe(() => this.saveState());
    }

    swapCurrencies() {
        const srcCurrency = this.form.get("srcCurrency");
        const destCurrency = this.form.get("destCurrency");
        const destCurrencyValue = destCurrency?.value;
        const srcCurrencyValue = srcCurrency?.value;

        destCurrency?.setValue(null, {emitEvent: false});
        srcCurrency?.setValue(destCurrencyValue, {emitEvent: false});
        destCurrency?.setValue(srcCurrencyValue, {emitEvent: false});

        this.saveCurrencyPreferences();
        this.transfer(this.srcAmount, this.srcCurrency, this.destAmount, this.destCurrency);
    }

    loadCurrencyPreferences() {
        try {
            const json = localStorage.getItem(this.PREFERENCES_KEY) || "{}";

            const preferences: Preferences = JSON.parse(json);

            const srcCurrency = this.currencyService.findCurrencyByShortName(preferences.srcCurrency);
            const destCurrency = this.currencyService.findCurrencyByShortName(preferences.destCurrency);

            this.form.get("srcCurrency")?.setValue(srcCurrency || this.currencyService.getFiatCurrencies()[0]);
            this.form.get("destCurrency")?.setValue(destCurrency || this.currencyService.getCoins()[0]);
        } catch (e) {
            console.error(e);
        }
    }

    saveCurrencyPreferences() {
        const srcCurrency = this.form.get("srcCurrency")?.value;
        const destCurrency = this.form.get("destCurrency")?.value;

        const preferences: Preferences = {};

        if (srcCurrency) preferences.srcCurrency = srcCurrency!.shortName;
        if (destCurrency) preferences.destCurrency = destCurrency!.shortName;

        localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    }

    transfer(srcAmount: any, srcCurrency: any, destAmount: any, destCurrency: any) {
        if (!srcAmount.value) {
            destAmount.setValue(undefined, {emitEvent: false});
            return;
        }
        this.currencyService.transfer(new BigNumber(srcAmount.value), srcCurrency.value, destCurrency.value)
            .subscribe(v => {
                destAmount.setValue(v.toNumber(), {emitEvent: false});
                this.ichange.emit();
            });
    }

    saveState() {
        this.bundle.saveInstance(this.composeId(this.id), {
            form: this.form
        });
        this.saveCurrencyPreferences();
    }

    restoreState() {
        const savedInstance = this.bundle.getSavedInstance(this.composeId(this.id));
        if (savedInstance?.form) {
            this.form = savedInstance.form;
        } else {
            this.loadCurrencyPreferences();
        }
    }

    private composeId(uid: string) {
        return `${this.uidPrefix}/${uid}`;
    }

    private get uidPrefix(): string {
        return "CurrencyConverter"
    }

    private currenciesExcluding(elem?: Currency | null): Currency[] {
        if (!elem) return this.currencyService.getCurrencies();
        return this.currencyService.getCurrencies()
            .filter(c => c.shortName.toLowerCase() != elem.shortName.toLowerCase());
    }

    protected readonly Math = Math;
    protected readonly faRightLeft = faRightLeft;
}
