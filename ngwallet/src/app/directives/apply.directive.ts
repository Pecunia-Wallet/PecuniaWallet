import {AfterViewInit, Directive, EventEmitter, OnInit, Output} from "@angular/core";

@Directive({
    selector: "[apply]",
    standalone: true
})
export class ApplyDirective implements AfterViewInit {

    @Output() apply: EventEmitter<any> = new EventEmitter<any>();

    ngAfterViewInit() {
        this.apply.emit();
    }

}
