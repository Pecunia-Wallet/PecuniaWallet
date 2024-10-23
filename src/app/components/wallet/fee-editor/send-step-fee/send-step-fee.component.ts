import {Component} from "@angular/core";
import {LoaderComponent} from "../../loader/loader.component";
import {WalletHeaderComponent} from "../../wallet-header/wallet-header.component";
import {CheckboxComponent} from "../../../checkbox/checkbox.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {BrokerService} from "../../../../services/broker.service";
import {BundleService} from "../../../../services/bundle.service";
import {WalletService} from "../../../../services/wallet.service";
import {ActivatedRoute, Router} from "@angular/router";
import BigNumber from "bignumber.js";
import {getCoinName} from "../../../../app.config";
import {DropdownComponent} from "../../../dropdown/dropdown.component";
import {NgxSliderModule} from "@angular-slider/ngx-slider";
import {NgIf, TitleCasePipe} from "@angular/common";
import {InputComponent} from "../../../input/input.component";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ApplyDirective} from "../../../../directives/apply.directive";
import {IdentityService} from "../../../../services/identity.service";
import {catchError, of} from "rxjs";
import {FeeEditorComponent} from "../fee-editor.component";
import {faPaperPlane} from "@fortawesome/free-solid-svg-icons";

@Component({
    selector: "app-send-step-fee",
    standalone: true,
    imports: [
        LoaderComponent,
        WalletHeaderComponent,
        CheckboxComponent,
        FormsModule,
        ReactiveFormsModule,
        DropdownComponent,
        NgxSliderModule,
        NgIf,
        InputComponent,
        FaIconComponent,
        ApplyDirective,
        TitleCasePipe
    ],
    templateUrl: "../fee-editor.component.html",
    styleUrl: "../fee-editor.component.scss"
})
export class SendStepFeeComponent extends FeeEditorComponent {

    constructor(broker: BrokerService,
                bundle: BundleService,
                wallet: WalletService,
                route: ActivatedRoute,
                router: Router,
                id: IdentityService) {
        super(broker, bundle, wallet, route, router, id);
    }

    override get uid() {
        return `Wallet/Send/Fee:${getCoinName(this.route)}`;
    }

    get action(): string {
        return "Send funds";
    }

    get link(): string {
        return "/wallet/coin/send";
    }

    get icon() {
        return faPaperPlane;
    }

    get askSubtraction() {
        return true;
    }

    override confirm() {
        this.loading = true;
        this.id.proof().subscribe(proved => {
            if (!proved) {
                this.loading = false;
                return;
            }
            if (!this.broker.data.sendData?.recipients)
                this.router.navigate([".."], {
                    relativeTo: this.route,
                    queryParamsHandling: "preserve"
                });
            this.renewSliders();
            this.broker.data.send = {
                preventRestore: true
            };
            this.wallet.send(this.coin, this.broker.data.sendData.recipients!,
                new BigNumber(this.feePerKb), this.recipientsPayFees)
                .pipe(catchError(err => {
                    this.loading = false
                    return of(err);
                }))
                .subscribe((response) => {
                    if (response.code == 0) this.router.navigate(["../success"], {
                        relativeTo: this.route,
                        queryParamsHandling: "merge",
                        queryParams: {
                            id: response.txId
                        }
                    })
                    else this.router.navigate(["../error"], {
                        relativeTo: this.route,
                        queryParamsHandling: "merge",
                        queryParams: {
                            code: response.code
                        }
                    });
                    this.loading = false;
                });
        });
    }
}
