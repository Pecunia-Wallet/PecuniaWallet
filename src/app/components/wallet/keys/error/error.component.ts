import {Component, OnInit} from '@angular/core';
import {WalletHeaderComponent} from "../../wallet-header/wallet-header.component";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from "@angular/common";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {Coin} from "../../../../models/Coin";
import {WalletService} from "../../../../services/wallet.service";
import {BrokerService} from "../../../../services/broker.service";
import {faHome, faPenToSquare} from "@fortawesome/free-solid-svg-icons";

@Component({
    selector: 'app-import-error',
    standalone: true,
    imports: [
        WalletHeaderComponent,
        FaIconComponent,
        NgIf,
        NgSwitchCase,
        RouterLink,
        NgSwitch,
        NgSwitchDefault
    ],
    templateUrl: './error.component.html',
    styleUrl: '../../send-error/send-error.component.scss'
})
export class ErrorComponent implements OnInit {

    code: number;
    coin: Coin;

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private broker: BrokerService,
                private router: Router) {
        this.code = parseInt(route.snapshot.queryParamMap.get("code")!);
    }

    ngOnInit() {
        this.wallet.currentCoin(this.route).subscribe(coin => this.coin = coin!);
    }

    edit() {
        this.broker.data.import = null;
        this.router.navigate([".."], {
            relativeTo: this.route,
            queryParamsHandling: "merge",
            queryParams: {
                code: null
            }
        })
    }

    protected readonly faPenToSquare = faPenToSquare;
    protected readonly faHome = faHome;
}
