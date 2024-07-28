import {AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from "@angular/core";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faArrowRight,
    faChevronLeft,
    faChevronRight,
    faCircleExclamation,
    faPlus
} from "@fortawesome/free-solid-svg-icons";
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {dp, getCoinName, server, sleep, testnet} from "../../../app.config";
import {InputComponent} from "../../input/input.component";
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {ApplyDirective} from "../../../directives/apply.directive";
import {BundleService} from "../../../services/bundle.service";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import {ActivatedRoute, Router} from "@angular/router";
import {TransactionOutputs, WalletService} from "../../../services/wallet.service";
import {CurrencyService} from "../../../services/currency.service";
import {forkJoin, map, Observable, of, ReplaySubject, take} from "rxjs";
import {LoaderComponent} from "../loader/loader.component";
import BigNumber from "bignumber.js";
import {validate} from "multicoin-address-validator";
import {BrokerService} from "../../../services/broker.service";

interface Recipient {
    form: FormGroup;
    element: HTMLElement;
    addressValid?: boolean;
}

export function bindAmountChanges(currencyService: CurrencyService,
                                  form: FormGroup, sourceName: string, targetName: string,
                                  sourceCurrency: Coin | FiatCurrency,
                                  targetCurrency: Coin | FiatCurrency) {
    const target = form.get(targetName);
    form.get(sourceName)?.valueChanges.subscribe(amountChange => {
        if (!amountChange) {
            target?.setValue("", {emitEvent: false});
            return;
        }
        const amount = new BigNumber(amountChange!);
        if (amount.eq(new BigNumber("0"))) {
            target?.setValue("", {emitEvent: false});
            return;
        }
        currencyService.transfer(amount, sourceCurrency, targetCurrency)
            .subscribe(transferred => {
                target?.setValue(dp(transferred, targetCurrency.decimals), {emitEvent: false});
            });
    });
}

@Component({
    selector: "app-send-step-recipients",
    standalone: true,
    imports: [
        WalletHeaderComponent,
        FaIconComponent,
        NgIf,
        NgOptimizedImage,
        InputComponent,
        NgForOf,
        ReactiveFormsModule,
        ApplyDirective,
        LoaderComponent,
        AsyncPipe
    ],
    templateUrl: "./send-step-recipients.component.html",
    styleUrl: "./send-step-recipients.component.scss"
})
export class SendStepRecipientsComponent implements OnInit, AfterViewInit, OnDestroy {

    readonly MAX_RECIPIENTS = 25;

    @ViewChild("func") funcElem: ElementRef;
    @ViewChild("slider") slider: ElementRef;

    initializing = true;
    loading = false;

    coin: Coin;
    currency: FiatCurrency;
    balance: BigNumber;

    recipients: Recipient[] = [];
    currentIndex = 0;

    deleteQueue: Set<Recipient> = new Set();
    viewTaskQueue = new ReplaySubject<() => void>();

    constructor(private bundle: BundleService,
                private route: ActivatedRoute,
                private router: Router,
                private wallet: WalletService,
                private currencyService: CurrencyService,
                private broker: BrokerService) {}

    get uid() {
        return `Wallet/Send/Recipients ${getCoinName(this.route)}`;
    }

    saveState() {
        this.bundle.saveInstance(this.uid, {
            recipients: this.recipients,
            index: this.currentIndex
        });
    }

    async setIndexBypassAnimation(index: number) {
        const transition = getComputedStyle(this.slider.nativeElement).transition;
        this.slider.nativeElement.style.transition = "none";
        await sleep(25);
        this.currentIndex = index;
        await sleep(25);
        this.slider.nativeElement.style.transition = transition;
    }

    async restoreState() {
        if (this.broker.data.send?.preventRestore) return;
        const savedInstance = this.bundle.getSavedInstance(this.uid);
        if (savedInstance) {
            if (savedInstance.recipients) this.recipients = savedInstance.recipients
                .map((r: Recipient) => {
                    this.subscribeOnChanges(r);
                    return r;
                });
            if (savedInstance.index) await this.setIndexBypassAnimation(savedInstance.index);
        }
    }

    ngOnInit() {
        forkJoin([
            this.wallet.currentCoin(this.route).pipe(take(1)),
            this.currencyService.getAccountCurrency().pipe(take(1))
        ]).subscribe(async ([coin, currency]) => {
                const callback = () => {
                    this.coin = coin!;
                    this.currency = currency;

                    this.viewTaskQueue.next(async () => {
                        await this.restoreState();

                        if (this.broker.data.parsedRequest) {
                            const addr = this.broker.data.parsedRequest.address;
                            const amount = this.broker.data.parsedRequest.amount;
                            if (this.hasEmpty) {
                                const r = this.recipients.find(this.isEmpty);
                                if (addr) r!.form.get("address")!.setValue(addr);
                                if (amount) r!.form.get("amountCoins")!.setValue(dp(amount, this.coin.decimals));
                                await this.setIndexBypassAnimation(this.recipients.indexOf(r!));
                                r!.form.markAllAsTouched();
                            } else {
                                this.addRecipient(addr, amount);
                                await this.setIndexBypassAnimation(this.recipients.length - 1);
                            }
                        }

                        this.broker.data.parsedRequest = null;

                        if (this.recipients.length == 0) this.addRecipient();

                    });

                    return void 0;
                };
                forkJoin([
                    this.wallet.getBalance(coin!).pipe(take(1)),
                    of(callback()).pipe(take(1))
                ]).subscribe(([balance]) => {
                    this.balance = balance;
                    this.initializing = false;
                });
                this.wallet.onBalanceChange(coin!).subscribe(b => this.balance = b);
            }
        );
    }

    ngAfterViewInit() {
        this.viewTaskQueue.subscribe(fn => fn());
    }

    ngOnDestroy() {
        this.viewTaskQueue.complete();
        this.viewTaskQueue = null as any;
    }

    checkAddresses() {
        this.recipients.forEach(r => {
            const addr = r.form.get("address")!.value;
            r.addressValid = validate(addr, this.coin.shortName, {
                networkType: testnet ? "testnet" : "prod"
            });
            r.form.get("address")!.valueChanges.subscribe(_ => r.addressValid = true);
        });
        for (let i = 0; i < this.recipients.length; i++) {
            if (!this.recipients[i].addressValid) {
                if (this.currentIndex != i) {
                    this.currentRecipient?.element.animate([
                        {opacity: 1}, {opacity: 0}
                    ], {
                        duration: 100, easing: "ease-in-out", fill: "forwards"
                    });
                    this.currentIndex = i;
                    this.currentRecipient!.element!.animate([
                        {opacity: 0}, {opacity: 1}
                    ], {
                        duration: 100, easing: "ease-in-out", fill: "forwards"
                    });
                }
                return this.saveState();
            }
        }
    }

    get currentRecipient()
        :
        Recipient | undefined {
        return this.recipients[this.currentIndex];
    }

    subscribeOnChanges(recipient
                           :
                           Recipient
    ) {
        recipient.form.valueChanges.subscribe(_ => {
            this.saveState();
            if (recipient.form.touched &&
                recipient.form.get("address")!.invalid &&
                recipient.form.get("amountCoins")!.invalid)
                this.deleteQueue.add(recipient);
        });
    }

    addRecipient(address ?: string, amount ?: BigNumber) {
        if (this.recipients.length >= this.MAX_RECIPIENTS) return;
        const recipient = {
            form: new FormGroup({
                address: new FormControl(address || "", [Validators.required]),
                amountCoins: new FormControl("", [
                    Validators.required, v => {
                        const ok = new BigNumber(v.value).comparedTo(0) > 0;
                        if (!ok) return {nonPositive: true};
                        else return null;
                    }]),
                amountFiat: new FormControl("")
            }),
            element: null as any
        };
        this.subscribeOnChanges(recipient);
        bindAmountChanges(this.currencyService, recipient.form,
            "amountCoins", "amountFiat", this.coin!, this.currency!);
        bindAmountChanges(this.currencyService, recipient.form,
            "amountFiat", "amountCoins", this.currency!, this.coin!);
        recipient.form.get("amountCoins")!.setValue(amount ? dp(amount, this.coin.decimals) : "");
        if (address || amount) recipient.form.markAllAsTouched();
        this.recipients.push(recipient);
    }

    @HostListener("document:keydown.arrowRight", ["$event"])
    next(event ?: KeyboardEvent) {
        if (event && (event.target as HTMLElement).tagName == "INPUT") return;
        if (this.currentIndex >= this.recipients.length ||
            this.currentIndex >= this.MAX_RECIPIENTS - 1) return;
        blur();
        this.currentRecipient!.element.animate([
            {opacity: 1}, {opacity: 0}
        ], {
            duration: 100, easing: "ease-in-out", fill: "forwards"
        });
        (this.recipients[this.currentIndex + 1]?.element ||
            this.funcElem.nativeElement as HTMLElement).animate([
            {opacity: 0}, {opacity: 1}
        ], {
            duration: 50, easing: "ease-in-out", fill: "forwards"
        });
        this.currentIndex++;
        this.saveState();
    }

    @HostListener("document:keydown.arrowLeft", ["$event"])
    prev(event ?: KeyboardEvent) {
        if (event && (event.target as HTMLElement).tagName == "INPUT") return;
        if (this.currentIndex <= 0) return;
        blur();
        (this.currentRecipient?.element ||
            this.funcElem.nativeElement as HTMLElement).animate([
            {opacity: 1}, {opacity: 0}
        ], {
            duration: 100, easing: "ease-in-out", fill: "forwards"
        });
        this.recipients[this.currentIndex - 1]!.element.animate([
            {opacity: 0}, {opacity: 1}
        ], {
            duration: 50, easing: "ease-in-out", fill: "forwards"
        });
        this.currentIndex--;
        this.saveState();
    }

    add() {
        const lastRecipient = this.recipients[this.recipients.length - 1];
        if (lastRecipient.form.valid) return this.addRecipient();
        this.prev();
        let elem;
        if (this.currentRecipient?.form.get("address")?.invalid) {
            elem = lastRecipient.element!.querySelector("input")!;
        } else elem = lastRecipient.element!.querySelectorAll("input")[1]!;
        setTimeout(() => {
            elem.animate([
                {transform: "translateY(1px)"},
                {transform: "translateY(-3px)"},
                {transform: "translateY(2px)"},
                {transform: "translateY(-2px)"},
                {transform: "translateY(1px)"},
            ], {
                duration: 250, easing: "ease-in"
            });
            elem.focus();
        }, 300);
        this.saveState();
    }

    confirm() {
        this.insufficientMoney.subscribe(insufficientMoney => {
            if (!this.valid || insufficientMoney) return;
            this.checkAddresses();
            if (!this.valid) return;
            let recipients: TransactionOutputs = {};
            for (const recipient of this.recipients) {
                const address = recipient.form.get("address")!.value;
                const amount = new BigNumber(recipient.form.get("amountCoins")!.value);
                recipients[address] = amount;
            }
            this.broker.data.sendData = {
                recipients: recipients
            };
            this.router.navigate(["fee"], {
                relativeTo: this.route,
                queryParamsHandling: "preserve"
            });
        });
    }

    readRequest() {
        if (this.recipients.length >= this.MAX_RECIPIENTS && !this.hasEmpty) return;
        this.router.navigate(["/wallet/coin/request/read"], {
            queryParamsHandling: "preserve",
            state: {requested: true}
        });
    }

    @HostListener("document:focusout", ["$event"])
    focusOut(event
                 :
                 FocusEvent
    ) {
        if ((event?.target as HTMLElement).tagName != "INPUT") return;
        if ((event?.relatedTarget as HTMLElement)?.tagName == "INPUT") return;
        this.recipients.forEach((r, i) => {
            if (this.deleteQueue.has(r) && this.isEmpty(r)) {
                if (this.recipients.length > 1) {
                    this.recipients.splice(i, 1);
                    (this.currentRecipient?.element || this.funcElem.nativeElement)!.animate([
                        {opacity: 0}, {opacity: 1}
                    ], {
                        duration: 100, fill: "forwards"
                    })
                }
            }
        });
        this.deleteQueue = new Set<Recipient>();
        this.saveState();
    }

    isAddressRepeating(r
                           :
                           Recipient
    ) {
        const addr = r.form.get("address")!.value;
        if (addr == "") return false;
        return !!this.recipients
            .filter(_r => _r != r)
            .find(_r => _r.form.get("address")!.value == addr);
    }

    get valid() {
        return !this.recipients.find(r => r.form.invalid && !this.isEmpty(r)) &&
            this.recipients.find(r => r.form.valid) &&
            !this.recipients.find(r => r.addressValid == false) &&
            !this.recipients.find(r => this.isAddressRepeating(r));
    }

    get totalAmount() {
        if (this.recipients.length == 0) return new BigNumber("0");
        return this.recipients
            .map(r => new BigNumber(r.form.get("amountCoins")!.value || 0))
            .reduce((v1, v2) => v1.plus(v2));
    }

    get totalRecipients() {
        return this.recipients
            .filter(r => r.form.valid)
            .length;
    }

    get insufficientMoney()
        :
        Observable<boolean> {
        if (!
            this.coin
        )
            return of(true);
        return this.wallet.getBalance(this.coin).pipe(take(1), map(
            balance => this.totalAmount.comparedTo(balance) > 0));
    }

    isEmpty(r
                :
                Recipient
    ) {
        return r.form.get("address")!.value == "" && r.form.get("amountCoins")!.value == "";
    }

    get hasEmpty() {
        return !!this.recipients.find(this.isEmpty);
    }

    protected readonly faChevronLeft = faChevronLeft;
    protected readonly faChevronRight = faChevronRight;
    protected readonly server = server;
    protected readonly faArrowRight = faArrowRight;
    protected readonly faPlus = faPlus;
    protected readonly Math = Math;
    protected readonly dp = dp;
    protected readonly faCircleExclamation = faCircleExclamation;
}
