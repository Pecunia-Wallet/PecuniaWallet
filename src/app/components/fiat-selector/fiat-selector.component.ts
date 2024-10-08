import {AfterViewInit, Component, Input, OnInit} from "@angular/core";
import {DropdownComponent, DropdownItem} from "../dropdown/dropdown.component";
import {BehaviorSubject, forkJoin, take} from "rxjs";
import {server} from "../../app.config";
import {AsyncPipe, NgIf} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {CurrencyService} from "../../services/currency.service";
import {FiatCurrency} from "../../models/FiatCurrency";
import {AccountService} from "../../services/account.service";

@Component({
    selector: "app-fiat-selector",
    standalone: true,
    imports: [
        DropdownComponent
    ],
    templateUrl: "./fiat-selector.component.html",
    styleUrl: "./fiat-selector.component.scss"
})
export class FiatSelectorComponent implements OnInit {

    @Input() direction: "up" | "down" = "down";

    currencies: DropdownItem[] = [];
    selected: DropdownItem;

    constructor(protected currencyService: CurrencyService,
                protected account: AccountService,
                protected router: Router) {
    }

    private currencyToItem(currency: FiatCurrency): DropdownItem {
        return Object.assign(new DropdownItem(), {
            text: currency.shortName,
            spec: currency.symbol,
            image: {
                url: server + currency.imageUri
            }
        });
    }

    ngOnInit() {
        this.account.getAccountCurrency().pipe(take(1)).subscribe((currency) => {
            this.selected = this.currencyToItem(currency);
            this.currencies = this.currencyService.getFiatCurrencies().map(this.currencyToItem);
        });
    }

    selectCurrency(shortName: string) {
        const fiat = this.currencyService.findFiatByShortName(shortName);
        if (!fiat) return;
        this.account.setAccountCurrency(fiat!).subscribe(() => {
            const shouldReuseRoute = this.router.routeReuseStrategy.shouldReuseRoute;
            this.router.routeReuseStrategy.shouldReuseRoute = () => false;
            this.router.navigate([this.router.url.split("?")[0] || this.router.url], {
                queryParamsHandling: "merge"
            }).then(() => this.router.routeReuseStrategy.shouldReuseRoute = shouldReuseRoute);
        });
    }

}
