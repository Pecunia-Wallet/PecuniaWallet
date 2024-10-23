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
import {faCloudArrowDown} from "@fortawesome/free-solid-svg-icons";

@Component({
    selector: "app-import-step-fee",
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
export class ImportStepFeeComponent extends FeeEditorComponent {

    constructor(broker: BrokerService,
                bundle: BundleService,
                wallet: WalletService,
                route: ActivatedRoute,
                router: Router,
                id: IdentityService) {
        super(broker, bundle, wallet, route, router, id);
    }

    override get uid() {
        return `Wallet/Import/Fee:${getCoinName(this.route)}`;
    }

    get action(): string {
        return "Import funds";
    }

    get link(): string {
        return "/wallet/coin/import";
    }

    get icon() {
        return faCloudArrowDown;
    }

    get askSubtraction() {
        return false;
    }

    override confirm() {
        this.loading = true;
        if (!this.broker.data.import?.keys)
            this.router.navigate([this.link], {
                relativeTo: this.route,
                queryParamsHandling: "preserve"
            });
        this.renewSliders();
        this.broker.data.import.preventRestore = true;
        this.wallet.importKeys(this.coin, new BigNumber(this.feePerKb), this.broker.data.import.keys!)
            .pipe(catchError(err => {
                this.loading = false
                return of(err);
            }))
            .subscribe((response) => {
                if (response.code == 0) {
                    setTimeout(() => {
                        this.loading = false;
                        this.router.navigate(["/"], {
                            queryParamsHandling: "merge"
                        });
                    }, 3000);
                } else this.router.navigate(["../error"], {
                    relativeTo: this.route,
                    queryParamsHandling: "merge",
                    queryParams: {
                        code: response.code
                    }
                });
            });
    }
}
