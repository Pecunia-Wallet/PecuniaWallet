import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    forwardRef, HostBinding,
    HostListener,
    Input, OnChanges,
    OnInit,
    Output, SimpleChanges,
    ViewChild
} from "@angular/core";
import {faChevronDown, faChevronUp} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR} from "@angular/forms";
import {NgIf} from "@angular/common";
import BigNumber from "bignumber.js";
import {NgxMaskDirective} from "ngx-mask";

@Component({
    selector: "app-input",
    standalone: true,
    imports: [
        FaIconComponent,
        FormsModule,
        NgIf,
        NgxMaskDirective
    ],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        multi: true,
        useExisting: forwardRef(() => InputComponent)
    }],
    templateUrl: "./input.component.html",
    styleUrl: "./input.component.scss"
})
export class InputComponent implements ControlValueAccessor, AfterViewInit, OnInit, OnChanges {

    @HostBinding("class.input-wrapper") readonly class = true;

    @ViewChild("inputElement") inputElement: ElementRef;
    public nativeElement: Element;

    @Input() value: string;

    @Input() type: "text" | "number";
    @Input() placeholder: string;
    @Input() step: number;
    @Input() min: number;
    @Input() max: number;
    @Input() disabled = false;
    @Input() error = false;

    @Output() input: EventEmitter<string> = new EventEmitter();
    @Output() touched: EventEmitter<void> = new EventEmitter();

    private intervalId?: number;
    private speedIntervalId?: number;
    private speedIntervalIteration: number = 0;
    private speed: number;
    private stepFactor = 1;
    private changing = false;
    private growing = false;

    mask: string;
    allowNegatives = false;
    patterns = {
        "X": {pattern: /.*/g},
    }

    ngOnInit() {
        switch (this.type) {
            case "text":
                this.mask = "X*";
                break;
            case "number":
                this.mask = `separator.${this.dp(this.step)}`
        }
        this.allowNegatives = (!this.min && this.min != 0) || this.min < 0;
    }

    ngOnChanges() {
        this.ngOnInit();
    }

    dp(num: number) {
        const match = `${num}`.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
        if (!match) return 0;
        return Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? +match[2] : 0));
    }

    ngAfterViewInit() {
        this.nativeElement = this.inputElement.nativeElement;
    }

    registerOnChange(fn: (value: string) => void): void {
        this.input.subscribe(v => {
            if (this.type == "number") {
                v = v.replaceAll(/[^0-9.]/g, "");
                if (v == ".") v = "0.";
            }
            this.value = v;
            fn(v);
        });
    }

    registerOnTouched(fn: () => void): void {
        this.touched.subscribe(fn);
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    writeValue(value: string): void {
        this.value = value;
    }

    @HostListener("keydown.arrowUp")
    startIncrease() {
        if (!this.changing || (this.changing && !this.growing))
            this.startChange(true);
    }

    @HostListener("keydown.arrowDown")
    startDecrease() {
        if (!this.changing || (this.changing && this.growing))
            this.startChange(false);
    }

    startChange(grow: boolean) {
        this.stopChange();
        this.changing = true;
        this.growing = grow;
        this.updateValue(grow);
        this.speed = 200;
        this.intervalId = setInterval(() => this.updateValue(grow), this.speed);
        this.speedIntervalId = setInterval(() => {
            clearInterval(this.intervalId);
            this.speed = 300 * Math.exp(-0.25 * this.speedIntervalIteration++);
            this.intervalId = setInterval(() => this.updateValue(grow), this.speed);
            if (this.speedIntervalIteration > 30)
                if (this.stepFactor < Math.pow(10, this.dp(this.step) / 1.2))
                    this.stepFactor *= 1.5;
            if (this.speedIntervalIteration > 75)
                this.stepFactor *= 3;
        }, this.speed)
    }

    @HostListener("document:mouseup")
    @HostListener("keyup.arrowUp")
    @HostListener("keyup.arrowDown")
    stopChange() {
        this.changing = false;
        this.growing = false;
        this.speedIntervalIteration = 0;
        this.stepFactor = 1;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        if (this.speedIntervalId) {
            clearInterval(this.speedIntervalId);
            this.speedIntervalId = undefined;
        }
    }

    private updateValue(grow: boolean) {
        const step = new BigNumber(this.step || 1).multipliedBy(new BigNumber(this.stepFactor));
        const value = new BigNumber(this.value || 0);

        const min = (this.min || this.min == 0) && value.comparedTo(this.min) <= 0 && !grow;
        const max = (this.max || this.max == 0) && value.comparedTo(this.max) >= 0 && grow;
        if (min || max) {
            this.stopChange();
            return;
        }

        let newValue: BigNumber;
        if (grow) {
            newValue = BigNumber.min(
                value.plus(step),
                new BigNumber(this.max || +Infinity)
            );
        } else {
            newValue = BigNumber.max(
                value.minus(step),
                new BigNumber(this.min || -Infinity)
            );
        }

        if (newValue !== value) {
            this.value = newValue.toFixed(this.dp(this.step)).replace(",", ".");
            this.input.emit(this.value);
        }
    }

    protected readonly faChevronDown = faChevronDown;
    protected readonly faChevronUp = faChevronUp;
}
