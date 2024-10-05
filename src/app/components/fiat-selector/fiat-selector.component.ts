import {AfterViewInit, Component, Input, OnInit} from "@angular/core";
import {DropdownComponent, DropdownItem} from "../dropdown/dropdown.component";
import {BehaviorSubject, forkJoin, take} from "rxjs";
import {server} from "../../app.config";
import {AsyncPipe, NgIf} from "@angular/common";
import {ActivatedRoute, Router} from "@angular/router";
import {CurrencyService} from "../../services/currency.service";
import {FiatCurrency} from "../../models/FiatCurrency";

@Component({
    selector: "app-fiat-selector",
    standalone: true,
    imports: [
        DropdownComponent,
        AsyncPipe,
        NgIf
    ],
    templateUrl: "./fiat-selector.component.html",
    styleUrl: "./fiat-selector.component.scss"
})
export class FiatSelectorComponent implements OnInit {

    @Input() direction: "up" | "down" = "down";

    currencies$ = new BehaviorSubject<Array<DropdownItem>>([]);
    selected: DropdownItem;

    constructor(protected currencyService: CurrencyService,
                protected router: Router) {}

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
        forkJoin([
            this.currencyService.getFiatCurrencies().pipe(take(1)),
            this.currencyService.getAccountCurrency().pipe(take(1))
        ]).subscribe(([fiats, currency]) => {
            this.selected = this.currencyToItem(currency);
            this.currencies$.next(fiats.map(this.currencyToItem));
        });
    }

    selectCurrency(name: string) {
        this.currencyService.getFiatCurrencies()
            .subscribe(fiats => {
                const fiat = fiats.find(fiat => fiat.shortName == name);
                if (!fiat) return;
                this.currencyService.setAccountCurrency(fiat).subscribe(() => {
                    const shouldReuseRoute = this.router.routeReuseStrategy.shouldReuseRoute;
                    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
                    this.router.navigate([this.router.url.split("?")[0] || this.router.url], {
                        queryParamsHandling: "merge"
                    }).then(() => this.router.routeReuseStrategy.shouldReuseRoute = shouldReuseRoute);
                });
            });
    }

}
