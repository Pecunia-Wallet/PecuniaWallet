import {Component, OnInit} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {faArrowLeft, faDiagramNext, faPlus} from "@fortawesome/free-solid-svg-icons";
import {LoaderComponent} from "../loader/loader.component";
import {NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ApplyDirective} from "../../../directives/apply.directive";
import {WalletService} from "../../../services/wallet.service";
import {Coin} from "../../../models/Coin";
import {SyncService} from "../../../services/sync.service";
import {InputComponent} from "../../input/input.component";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {BundleService} from "../../../services/bundle.service";
import {getCoinName} from "../../../app.config";

interface Input {
    form: FormControl,
    element?: InputComponent
}

const MAX_KEY_COUNT = 10;

@Component({
    selector: "app-import",
    standalone: true,
    imports: [
        FaIconComponent,
        RouterLink,
        LoaderComponent,
        NgSwitch,
        NgSwitchCase,
        NgSwitchDefault,
        NgForOf,
        FormsModule,
        ReactiveFormsModule,
        NgIf,
        ApplyDirective,
        InputComponent,
        WalletHeaderComponent
    ],
    templateUrl: "./import.component.html",
    styleUrl: "./import.component.scss"
})
export class ImportComponent implements OnInit {

    loading = false;
    error = false;
    changes = false; // true if any changes were made after error

    coin: Coin;
    keys: Input[] = [
        {
            form: new FormControl("")
        },
    ];
    deleteQueue: Input[] = [];

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private router: Router,
                private syncService: SyncService,
                private bundle: BundleService) {
        this.restoreState();
    }

    get uid() {
        return `Wallet/ImportPrivates:${getCoinName(this.route)}`;
    }

    restoreState() {
        const savedInputs = (this.bundle.getSavedInstance(this.uid) || []) as Input[];
        if (savedInputs.length > 0) this.keys = savedInputs;
    }

    ngOnInit() {
        this.wallet.currentCoin(this.route).subscribe(coin => this.coin = coin!);
    }

    setInputElement(input: Input, element: InputComponent) {
        input.form.valueChanges.subscribe(v => this.onKeyInput(input, v));
        element.nativeElement!.addEventListener("focusout", () => {
            if (this.keys.length > 1 && this.deleteQueue.includes(input) && input.form.value == "") {
                this.keys.splice(this.keys.indexOf(input), 1);
            }
            this.deleteQueue.splice(this.deleteQueue.indexOf(input), 1);
        });
        (element.nativeElement! as HTMLElement).focus({
            preventScroll: true
        });
        input.element = element;
    }

    onKeyInput(input: Input, value: string | null) {
        value = value?.replaceAll(/[^a-zA-Z0-9]/g, "").substring(0, 1000) || "";
        if (value == "") this.deleteQueue.push(input);
        else input.form.setValue(value, {emitEvent: false});
        this.changes = true;
        this.bundle.saveInstance(this.uid, this.keys);
    }

    addForm() {
        if (this.loading) return;
        const lastInput = this.keys[this.keys.length - 1];
        let add = true;
        if (lastInput.form.value == "") {
            add = false;
            lastInput.element?.nativeElement.animate([
                {transform: "translateY(1px)"},
                {transform: "translateY(-3px)"},
                {transform: "translateY(2px)"},
                {transform: "translateY(-2px)"},
                {transform: "translateY(1px)"},
            ], {
                duration: 250, easing: "ease-in"
            });
            (lastInput.element?.nativeElement as HTMLElement)?.focus();
        }
        if (add) {
            const key = {
                form: new FormControl("")
            };
            this.keys.push(key);
        }
    }

    import() {
        if (!this.valid || this.loading) return;
        this.loading = true;
        this.wallet
            .importKeys(this.coin, this.keys
                .map(input => input.form.value)
                .filter(key => key.length >= 10))
            .subscribe(result => {
                if (!result) {
                    this.changes = false;
                    this.error = true;
                    this.loading = false;
                } else {
                    setTimeout(() =>
                        this.syncService.renewSync().subscribe(() =>
                            this.router.navigate(["/sync"], {
                                queryParamsHandling: "merge"
                            })
                        ), 3000);
                }
            })
    }

    get valid() {
        return this.keys.find(input => input.form.value.length >= 10) &&
            (this.error ? this.changes : true);
    }

    protected readonly faArrowLeft = faArrowLeft;
    protected readonly faPlus = faPlus;
    protected readonly MAX_KEY_COUNT = MAX_KEY_COUNT;
    protected readonly faDiagramNext = faDiagramNext;
}
