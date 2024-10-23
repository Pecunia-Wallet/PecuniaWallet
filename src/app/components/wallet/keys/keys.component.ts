import {Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {faFileImport, faInfoCircle, faPaperclip, faPlus} from "@fortawesome/free-solid-svg-icons";
import {LoaderComponent} from "../loader/loader.component";
import {NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, TitleCasePipe} from "@angular/common";
import {FormControl, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ApplyDirective} from "../../../directives/apply.directive";
import {WalletService} from "../../../services/wallet.service";
import {Coin} from "../../../models/Coin";
import {InputComponent} from "../../input/input.component";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {BundleService} from "../../../services/bundle.service";
import {BrokerService} from "../../../services/broker.service";
import {getCoinName} from "../../../app.config";
import {ModalComponent} from "../../modal/modal.component";
import {Animation} from "chart.js";

interface Input {
    form: FormControl,
    element?: InputComponent
}

interface SwapConf {
    top: HTMLElement;
    bottom: HTMLElement;
    topWidth: number;
    bottomWidth: number;
    animations: globalThis.Animation[];
}

const MAX_KEY_COUNT = 10;

@Component({
    selector: "app-keys",
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
        WalletHeaderComponent,
        TitleCasePipe,
        ModalComponent
    ],
    templateUrl: "./keys.component.html",
    styleUrl: "./keys.component.scss"
})
export class KeysComponent implements OnInit {

    @ViewChild("importButton") importButton: ElementRef;
    @ViewChild("attachButton") attachButton: ElementRef;
    @ViewChild("buttons") buttonContainer: ElementRef;

    loading = false;
    error = false;
    changes = false; // true if any changes were made after error

    coin: Coin;
    keys: Input[] = [
        {
            form: new FormControl("")
        }
    ];
    deleteQueue: Input[] = [];

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private router: Router,
                private bundle: BundleService,
                private broker: BrokerService) {
        this.restoreState();
    }

    get uid(): string {
        return `Wallet/Keys:${getCoinName(this.route)}`;
    }

    restoreState() {
        const savedInputs = (this.bundle.getSavedInstance(this.uid) || []) as Input[];
        if (this.broker.data.import?.preventRestore) return;
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

    swapButtons(top: HTMLElement, bottom: HTMLElement): SwapConf {
        const topWidth = top.offsetWidth;
        const bottomWidth = bottom.offsetWidth;
        const containerWidth = this.buttonContainer.nativeElement.offsetWidth;
        const animations: globalThis.Animation[] = [];

        this.buttonContainer.nativeElement.style.width = `${containerWidth}px`;

        if (this.buttonContainer.nativeElement.children[0] === top) {
            bottom.style.position = "absolute";
        } else {
            top.style.position = "absolute";
        }

        bottom.animate([
            {width: bottomWidth + "px"},
            {width: "70px"}
        ], {
            duration: 170, fill: "forwards"
        }).onfinish = () => {
            const animation = bottom.animate([
                {opacity: bottom.style.opacity},
                {opacity: 0}
            ], {
                duration: 50, fill: "forwards"
            });
            animations.push(animation);
            animation.commitStyles();
        }

        top.animate([
            {width: topWidth + "px"},
            {width: containerWidth + "px"}
        ], {
            duration: 400, easing: "ease-out", fill: "forwards"
        });

        return {
            top: top,
            bottom: bottom,
            topWidth: topWidth,
            bottomWidth: bottomWidth,
            animations: animations
        };
    }

    restoreButtons(swapConf: SwapConf) {
        swapConf.top.animate([
            {width: swapConf.top.offsetWidth + "px"},
            {width: swapConf.topWidth + "px"}
        ], {
            duration: 500, fill: "forwards", easing: "ease-in-out"
        });

        swapConf.bottom.animate([
            {width: swapConf.bottom.offsetWidth + "px"},
            {width: swapConf.bottomWidth + "px"}
        ], {
            duration: 400, fill: "forwards", easing: "ease-in"
        });

        const animation = swapConf.bottom.animate([
            {opacity: 0},
            {opacity: this.valid ? 1 : .5}
        ], {
            duration: 400, fill: "forwards", easing: "ease-in"
        });
        animation.commitStyles();
        animation.onfinish = () => {
            swapConf.bottom.animate([
                {opacity: swapConf.bottom.style.opacity},
                {opacity: ""}
            ], {
                fill: "forwards", duration: 0
            }).commitStyles();
            animation.cancel();
        };

        swapConf.animations.forEach(a => a.cancel());
    }

    import() {
        if (!this.valid || this.loading) return;
        this.loading = true;
        const swc = this.swapButtons(this.importButton.nativeElement, this.attachButton.nativeElement);
        const keys = this.keys
            .map(input => input.form.value)
            .filter(key => key.length >= 10);
        this.wallet
            .verifyKeys(this.coin, keys)
            .subscribe(result => {
                if (!result) {
                    setTimeout(() => {
                        this.changes = false;
                        this.error = true;
                        this.loading = false;
                        this.restoreButtons(swc);
                    }, 1000);
                } else {
                    this.broker.data.import = {
                        keys: keys
                    };
                    setTimeout(() => this.router.navigate(["/wallet/coin/import/fee"], {
                        queryParamsHandling: "merge"
                    }), 300);
                }
            })
    }

    attach() {
        if (!this.valid || this.loading) return;
        this.loading = true;
        const swc = this.swapButtons(this.attachButton.nativeElement, this.importButton.nativeElement);
        this.wallet
            .attachKeys(this.coin, this.keys
                .map(input => input.form.value)
                .filter(key => key.length >= 10))
            .subscribe(result => {
                if (!result) {
                    setTimeout(() => {
                        this.changes = false;
                        this.error = true;
                        this.loading = false;
                        this.restoreButtons(swc);
                    }, 1000);
                } else {
                    setTimeout(() => this.router.navigate(["/"]), 5000);
                    setTimeout(() => this.wallet.getBalance(this.coin, true), 7000);
                }
            })
    }

    get valid() {
        return this.keys.find(input => input.form.value.length >= 10) &&
            (this.error ? this.changes : true);
    }

    protected readonly faPlus = faPlus;
    protected readonly MAX_KEY_COUNT = MAX_KEY_COUNT;
    protected readonly faPaperclip = faPaperclip;
    protected readonly faFileImport = faFileImport;
    protected readonly faInfoCircle = faInfoCircle;
}
