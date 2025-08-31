import { Component } from '@angular/core';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowsRotate} from "@fortawesome/free-solid-svg-icons";
import {FooterComponent} from "../footer/footer.component";
import {WalletService} from "../../services/wallet.service";

@Component({
  selector: 'app-sync',
  standalone: true,
    imports: [
        FaIconComponent,
        FooterComponent
    ],
  templateUrl: './sync.component.html',
  styleUrl: './sync.component.scss'
})
export class SyncComponent {

    constructor(private wallet: WalletService) {
    }

    protected readonly faArrowsRotate = faArrowsRotate;
}
