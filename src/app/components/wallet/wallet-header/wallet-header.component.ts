import {Component, HostBinding, Input} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {RouterLink} from "@angular/router";
import {faArrowLeft} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'app-wallet-header',
  standalone: true,
    imports: [
        FaIconComponent,
        RouterLink
    ],
  templateUrl: './wallet-header.component.html',
  styleUrl: './wallet-header.component.scss'
})
export class WalletHeaderComponent {

    @HostBinding("attr.title") readonly _title = "";

    @Input() title: string;
    @Input() link?: string;
    @Input() params: any;

    protected readonly faArrowLeft = faArrowLeft;
}
