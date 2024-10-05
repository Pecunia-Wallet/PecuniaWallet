import {Component, Input, forwardRef, Output, EventEmitter, HostBinding, AfterViewInit, Host} from "@angular/core";
import {ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule} from "@angular/forms";

@Component({
    selector: "app-checkbox",
    standalone: true,
    imports: [
        ReactiveFormsModule
    ],
    providers: [{
        provide: NG_VALUE_ACCESSOR,
        multi: true,
        useExisting: forwardRef(() => CheckboxComponent)
    }],
    templateUrl: "./checkbox.component.html",
    styleUrl: "./checkbox.component.scss"
})
export class CheckboxComponent implements ControlValueAccessor {

    @HostBinding("class.checkbox") readonly class = true;

    @HostBinding("class.init") initializing = false;

    @Input() @HostBinding("class.disabled") disabled = false;

    @Output() touched: EventEmitter<void> = new EventEmitter();

    value = new FormControl(false);

    setValueBypassAnimation(value: boolean) {
        this.initializing = true;
        setTimeout(() =>
            this.value.setValue(value, { emitEvent: false }), 50);
        setTimeout(() => this.initializing = false, 150);
    }

    registerOnChange(fn: (v: boolean) => void) {
        this.value.valueChanges.subscribe(v => fn(!!v));
    }

    registerOnTouched(fn: () => void) {
        this.touched.subscribe(() => fn());
    }

    setDisabledState(isDisabled: boolean) {
        this.disabled = isDisabled;
    }

    writeValue(checked: boolean) {
        this.value.setValue(checked, { emitEvent: false })
    }

}
