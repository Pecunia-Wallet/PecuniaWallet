import {Component, OnInit} from "@angular/core";
import {WalletService} from "../../../services/wallet.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {Coin} from "../../../models/Coin";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from "@angular/common";
import {faHome, faPenToSquare} from "@fortawesome/free-solid-svg-icons";
import {BrokerService} from "../../../services/broker.service";

@Component({
  selector: 'app-send-error',
  standalone: true,
    imports: [
        FaIconComponent,
        RouterLink,
        WalletHeaderComponent,
        NgSwitch,
        NgSwitchCase,
        NgSwitchDefault,
        NgIf
    ],
  templateUrl: './send-error.component.html',
  styleUrl: './send-error.component.scss'
})
export class SendErrorComponent implements OnInit {

    loading = true;

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
        this.broker.data.send = null;
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
