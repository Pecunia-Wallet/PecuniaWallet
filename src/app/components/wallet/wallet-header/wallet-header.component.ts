import {Component, HostBinding, HostListener, Input, signal} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {RouterLink} from "@angular/router";
import {faArrowLeft} from "@fortawesome/free-solid-svg-icons";
import {Ripple} from "primeng/ripple";
import {WindowComponent} from "../../window/window.component";

@Component({
  selector: 'app-wallet-header',
  standalone: true,
    imports: [
        FaIconComponent,
        RouterLink,
        Ripple
    ],
  templateUrl: './wallet-header.component.html',
  styleUrl: './wallet-header.component.scss'
})
export class WalletHeaderComponent {

    @HostBinding("attr.title") readonly _title = "";

    @HostBinding("class.mobile") get mobile(){ return this._window.isMobile(); }

    @Input() title: string;
    @Input() link?: string;
    @Input() params: any;

    constructor(private _window: WindowComponent) {}

    protected readonly faArrowLeft = faArrowLeft;
}
