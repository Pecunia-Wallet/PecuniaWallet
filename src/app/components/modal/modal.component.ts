import {Component, ElementRef, HostBinding, HostListener, ViewChild} from '@angular/core';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCross, faXmark} from "@fortawesome/free-solid-svg-icons";
import {EventListener} from "@angular-slider/ngx-slider/event-listener";

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [
        FaIconComponent
    ],
    templateUrl: './modal.component.html',
    styleUrl: './modal.component.scss'
})
export class ModalComponent {

    @HostBinding("class.hidden") private hidden: boolean = true;

    @ViewChild("frame") frame: ElementRef;

    hide() {
        this.hidden = true;
    }

    show() {
        this.hidden = false;
    }

    @HostListener("click", ["$event.target"])
    onClick(t: HTMLElement) {
        if (!this.frame.nativeElement.contains(t) && this.frame.nativeElement !== t)
            this.hide();
    }

    protected readonly faXmark = faXmark;
}
