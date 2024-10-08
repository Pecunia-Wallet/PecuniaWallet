import {AfterViewInit, Component, ElementRef, forwardRef, HostBinding, Input, OnInit, ViewChild} from '@angular/core';
import {MultiSelect} from "primeng/multiselect";
import {Coin} from "../../models/Coin";
import {CurrencyService} from "../../services/currency.service";
import {NgOptimizedImage} from "@angular/common";
import {server} from "../../app.config";
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR} from "@angular/forms";
import {Select} from "primeng/select";
import {FiatCurrency} from "../../models/FiatCurrency";
import {Currency} from "../../models/Currency";

@Component({
    selector: 'app-currency-select',
    imports: [
        MultiSelect,
        NgOptimizedImage,
        Select,
        FormsModule
    ],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        multi: true,
        useExisting: forwardRef(() => CurrencyMultiselectComponent)
    }],
    templateUrl: './currency-multiselect.component.html',
    styleUrl: './currency-multiselect.component.scss'
})
export class CurrencyMultiselectComponent implements ControlValueAccessor, AfterViewInit, OnInit {

    @ViewChild("select") select: ControlValueAccessor;

    @Input() multi: boolean = false;
    @Input() placeholder: string;
    @Input() mode: "crypto" | "fiat" | "all" = "all";
    @Input() currencies: Currency[];
    @Input() appendTo: any;

    afterViewInitTaskQueue: Array<() => void> = [];

    constructor(private el: ElementRef,
                private currencyService: CurrencyService) {
    }

    ngOnInit() {
        if (this.currencies) return;

        this.currencies = this.mode == "crypto"
            ? this.currencyService.getCoins() : this.mode == "fiat"
                ? this.currencyService.getFiatCurrencies()
                : this.currencyService.getCurrencies();
    }

    hasClass(str: string): boolean {
        return this.el.nativeElement.classList.contains(str);
    }

    ngAfterViewInit() {
        let task;
        this.select.writeValue(this.currencies);

        while ((task = this.afterViewInitTaskQueue.pop())) {
            task();
        }
    }

    writeValue(obj: any): void {
        this.afterViewInit(() => this.select.writeValue(obj));
    }

    registerOnChange(fn: any): void {
        this.afterViewInit(() => this.select.registerOnChange(fn));
    }

    registerOnTouched(fn: any): void {
        this.afterViewInit(() => this.select.registerOnTouched(fn));
    }

    setDisabledState?(isDisabled: boolean): void {
        this.afterViewInit(() => this.select.setDisabledState!(isDisabled));
    }

    private afterViewInit(task: () => void) {
        if (this.select) task();
        else this.afterViewInitTaskQueue.push(task);
    }

    protected readonly server = server;
}
