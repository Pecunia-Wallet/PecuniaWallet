import { Component } from '@angular/core';
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowUpRightFromSquare, faHome} from "@fortawesome/free-solid-svg-icons";
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons';

@Component({
  selector: 'app-send-successful',
  standalone: true,
    imports: [
        WalletHeaderComponent,
        FaIconComponent,
        RouterLink
    ],
  templateUrl: './send-successful.component.html',
  styleUrl: './send-successful.component.scss'
})
export class SendSuccessfulComponent {

    id: string;

    constructor(private route: ActivatedRoute) {
        this.id = route.snapshot.queryParamMap.get("id")!;
    }

    protected readonly faCircleCheck = faCircleCheck;
    protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
    protected readonly faHome = faHome;
}
