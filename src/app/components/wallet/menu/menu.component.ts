import {Component, ElementRef, OnInit} from "@angular/core";
import {WalletService} from "../../../services/wallet.service";
import {WindowComponent} from "../../window/window.component";
import {BehaviorSubject, first, forkJoin} from "rxjs";
import BigNumber from "bignumber.js";
import {server, range, dp} from "../../../app.config";
import {FiatSelectorComponent} from "../../fiat-selector/fiat-selector.component";
import {FloatBarComponent} from "../../window/float-bar/float-bar.component";
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {OverviewComponent} from "../overview/overview.component";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {CurrencyService} from "../../../services/currency.service";
import {Coin} from "../../../models/Coin";
import {FiatCurrency} from "../../../models/FiatCurrency";
import { Rate } from "../../../models/Rate";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCashRegister, faGrip, faPlay, faXmark} from "@fortawesome/free-solid-svg-icons";
import {AccountService} from "../../../services/account.service";

interface CoinButton {
    coin: Coin;
    fiat: FiatCurrency;
    coinBalance: BigNumber;
    fiatBalance: BigNumber;
}

@Component({
    selector: "app-menu",
    standalone: true,
    imports: [
        FiatSelectorComponent,
        FloatBarComponent,
        NgForOf,
        NgOptimizedImage,
        OverviewComponent,
        RouterLink,
        FaIconComponent,
        NgIf,
        AsyncPipe
    ],
    templateUrl: "./menu.component.html",
    styleUrl: "./menu.component.scss"
})
export class MenuComponent implements OnInit {

    coinButtons: CoinButton[];
    coins: Coin[] = [];
    accountCurrency: FiatCurrency;
    coinOrder = ["BTC", "LTC", "DOGE", "BCH"]

    draggedIndex: number | null = null;
    draggedOverIndex: number | null = null;
    dropTargetIndex: number | null = null;
    dropPosition: 'before' | 'after' | null = null;

    constructor(protected currencyService: CurrencyService,
                protected wallet: WalletService,
                protected ref: ElementRef,
                protected account: AccountService,
                protected _window: WindowComponent,
                protected route: ActivatedRoute) {
        this.loadPreferences();
    }

    loadPreferences() {
        try {
            const order = localStorage.getItem("coinOrder");
            if (!order) return;
            this.coinOrder = JSON.parse(order);
        } catch (error) {
            console.error("Failed to load coin order", error);
        }
    }

    saveOrder() {
        try {
            localStorage.setItem("coinOrder", JSON.stringify(this.coinOrder));
        } catch (error) {
            console.error("Failed to save coin order", error);
        }
    }

    renew() {
        const res$ = new BehaviorSubject<Array<CoinButton>>([]);
        this.coins.forEach(coin => this.wallet
            .getBalance(coin)
            .subscribe(balance => {
                this.currencyService.transfer(balance.available, coin, this.accountCurrency)
                    .subscribe(fiatBalance => res$.next([
                        ...res$.value,
                        {
                            coin: coin,
                            fiat: this.accountCurrency,
                            coinBalance: balance.available,
                            fiatBalance: fiatBalance
                        }
                    ]));
            }));
        res$.subscribe(res => {
            if (res.length == this.coins.length) {
                this.coinButtons = res.sort((a, b) => this.coinOrder.indexOf(a.coin.shortName) - this.coinOrder.indexOf(b.coin.shortName));
                this.ref.nativeElement.querySelectorAll(".placeholders")
                    .forEach((placeholder: any) => setTimeout(() => placeholder.remove(), 350));
            }
        });
    }

    ngOnInit() {
        this.account.getAccountCurrency().pipe(first()).subscribe((accountCurrency) => {
            this.coins = this.currencyService.getCoins();
            this.accountCurrency = accountCurrency;
            forkJoin(this.coins.map(coin => this.wallet.getBalance(coin))).subscribe(_ => {
                this.coins.forEach(coin => this.wallet.onBalanceChange(coin).subscribe(() => this.renew()));
                this.renew();
            });
            let rates: Rate[] | null = null;
            this.currencyService.rates$.subscribe(_rates => {
                if (!rates || rates != _rates) this.renew();
                rates = _rates;
            })
        });
    }

    fitBalance(v: BigNumber, coin: Coin) {
        let decimals = coin.decimals;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const str = dp(v, decimals--);
            if (str.length <= 12) return str;
        }
    }

    onDragStart(event: DragEvent, index: number) {
        this.draggedIndex = index;
        this.dropTargetIndex = null;
        this.dropPosition = null;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', '');
        }
        (event.target as HTMLElement).classList.add('dragging');
    }

    onDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        if (this.draggedIndex === null || this.draggedIndex === index) {
            return;
        }

        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const mouseY = event.clientY;
        const elementCenter = rect.top + rect.height / 2;

        const newPosition = mouseY < elementCenter ? 'before' : 'after';

        if ((index === this.draggedIndex - 1 && newPosition === 'after') ||
            (index === this.draggedIndex + 1 && newPosition === 'before')) {
            this.dropTargetIndex = null;
            this.dropPosition = null;
            return;
        }

        if (this.dropTargetIndex === index && this.dropPosition === newPosition) {
            return;
        }

        if (this.dropTargetIndex !== null && this.dropPosition === 'after' &&
            index === this.dropTargetIndex + 1 && newPosition === 'before') {
            return;
        }

        if (this.dropTargetIndex !== null && this.dropPosition === 'before' &&
            index === this.dropTargetIndex - 1 && newPosition === 'after') {
            return;
        }

        this.dropTargetIndex = index;
        this.dropPosition = newPosition;
    }

    onDragEnd(event: DragEvent) {
        (event.target as HTMLElement).classList.remove('dragging');
        this.draggedIndex = null;
        this.dropTargetIndex = null;
        this.dropPosition = null;
    }

    onDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        event.stopPropagation();

        if (this.draggedIndex === null || this.dropTargetIndex === null || this.dropPosition === null) {
            this.draggedIndex = null;
            this.dropTargetIndex = null;
            this.dropPosition = null;
            return;
        }

        const newButtons = [...this.coinButtons];
        const draggedButton = newButtons[this.draggedIndex];

        newButtons.splice(this.draggedIndex, 1);

        let insertIndex = this.dropTargetIndex;
        if (this.draggedIndex < this.dropTargetIndex) {
            insertIndex--;
        }
        if (this.dropPosition === 'after') {
            insertIndex++;
        }

        newButtons.splice(insertIndex, 0, draggedButton);

        this.coinButtons = newButtons;
        this.coinOrder = newButtons.map(b => b.coin.shortName);
        this.saveOrder();

        this.draggedIndex = null;
        this.dropTargetIndex = null;
        this.dropPosition = null;
    }

    onContainerDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
    }

    onContainerDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();

        // Если есть валидная позиция для drop, выполняем перестановку
        if (this.draggedIndex !== null && this.dropTargetIndex !== null && this.dropPosition !== null) {
            const newButtons = [...this.coinButtons];
            const draggedButton = newButtons[this.draggedIndex];

            newButtons.splice(this.draggedIndex, 1);

            let insertIndex = this.dropTargetIndex;
            if (this.draggedIndex < this.dropTargetIndex) {
                insertIndex--;
            }
            if (this.dropPosition === 'after') {
                insertIndex++;
            }

            newButtons.splice(insertIndex, 0, draggedButton);

            this.coinButtons = newButtons;
            this.coinOrder = newButtons.map(b => b.coin.shortName);
            this.saveOrder();
        }

        this.draggedIndex = null;
        this.dropTargetIndex = null;
        this.dropPosition = null;
    }

    onTouchStart(event: TouchEvent, index: number) {
        const target = event.target as HTMLElement;
        const handle = target.closest('.handle');
        if (!handle) return;

        event.preventDefault();
        this.draggedIndex = index;

        const button = target.closest('.coin') as HTMLElement;
        if (button) {
            button.classList.add('dragging');
        }
    }

    onTouchMove(event: TouchEvent, index: number) {
        if (this.draggedIndex === null) return;

        const touch = event.touches[0];
        const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const coinElement = elementAtPoint?.closest('.coin');

        if (coinElement) {
            event.preventDefault();
            const buttons = Array.from(this.ref.nativeElement.querySelectorAll('.coin'));
            const targetIndex = buttons.indexOf(coinElement);
            if (targetIndex !== -1) {
                this.draggedOverIndex = targetIndex;
            }
        }
    }

    onTouchEnd(event: TouchEvent) {
        if (this.draggedIndex === null) return;

        const target = event.target as HTMLElement;
        const button = target.closest('.coin') as HTMLElement;
        if (button) {
            button.classList.remove('dragging');
        }

        if (this.draggedOverIndex !== null && this.draggedIndex !== this.draggedOverIndex) {
            const newButtons = [...this.coinButtons];
            const draggedButton = newButtons[this.draggedIndex];

            newButtons.splice(this.draggedIndex, 1);

            const insertIndex = this.draggedIndex < this.draggedOverIndex ? this.draggedOverIndex - 1 : this.draggedOverIndex;
            newButtons.splice(insertIndex, 0, draggedButton);

            this.coinButtons = newButtons;
            this.coinOrder = newButtons.map(b => b.coin.shortName);
            this.saveOrder();
        }

        this.draggedIndex = null;
        this.draggedOverIndex = null;
    }

    closeHint(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        this.account.closeMerchantHint();
    }

    protected readonly server = server;
    protected readonly range = range;
    protected readonly faCashRegister = faCashRegister;
    protected readonly faGrip = faGrip;
    protected readonly faXmark = faXmark;
    protected readonly faPlay = faPlay;
}