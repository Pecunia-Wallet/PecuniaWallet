import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding, HostListener,
    ViewChild
} from '@angular/core';
import {DatePicker} from "primeng/datepicker";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faArrowDown,
    faArrowUp,
    faCheck, faChevronDown, faFilter, faLink,
    faPlus,
    faRotate,
    faRotateRight, faSpinner, faXmark
} from "@fortawesome/free-solid-svg-icons";
import {InputComponent} from "../../input/input.component";
import {Select} from "primeng/select";
import {CurrencyMultiselectComponent} from "../../currency-multiselect/currency-multiselect.component";
import {
    AbstractControl,
    FormControl,
    FormGroup,
    FormsModule,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from "@angular/forms";
import {CurrencyService} from "../../../services/currency.service";
import {BundleService} from "../../../services/bundle.service";
import {ApiService, Invoice, Settings} from "../../../services/api.service";
import {BehaviorSubject, catchError, map, Observable, of, take, tap, throwError} from "rxjs";
import {
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    NgClass,
    NgForOf,
    NgIf,
    NgTemplateOutlet,
    UpperCasePipe
} from "@angular/common";
import {Paginator, PaginatorState} from "primeng/paginator";
import {Coin} from "../../../models/Coin";
import BigNumber from "bignumber.js";
import {dp} from "../../../app.config";
import {faCopy} from "@fortawesome/free-regular-svg-icons";
import {Tooltip} from "primeng/tooltip";
import {ApplyDirective} from "../../../directives/apply.directive";
import {Dialog} from "primeng/dialog";
import {Error, AvatarPickerComponent} from "../avatar-picker/avatar-picker.component";
import {HotToastService} from "@ngxpert/hot-toast";
import {WindowComponent} from "../../window/window.component";
import {Ripple} from "primeng/ripple";
import {StatisticService} from "../../../services/statistic.service";
import {Router, RouterLink} from "@angular/router";

class SortOption {
    value: string;
    name: string;

    constructor(name: string, value: string) {
        this.value = value;
        this.name = name;
    }
}

interface InvoiceExt extends Invoice {
    expanded?: boolean;
    loading?: boolean;
    element?: HTMLElement;
}

interface InvoiceCache extends InvoiceExt {
    cacheExpiry: Date;
}

interface Preferences {
    coins: Coin[];
    sort: SortOption;
    sortDirection: "asc" | "desc";
    startDate: any;
    endDate: any;
}

@Component({
    selector: 'app-history',
    imports: [
        DatePicker,
        FaIconComponent,
        InputComponent,
        Select,
        CurrencyMultiselectComponent,
        FormsModule,
        ReactiveFormsModule,
        AsyncPipe,
        Paginator,
        NgForOf,
        DatePipe,
        NgClass,
        NgIf,
        Tooltip,
        ApplyDirective,
        Dialog,
        AvatarPickerComponent,
        UpperCasePipe,
        DecimalPipe,
        NgTemplateOutlet,
        Ripple,
        RouterLink
    ],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss'
})
export class HistoryComponent implements AfterViewInit {

    @ViewChild("invoiceCreate") invoiceCreate: ElementRef;
    @ViewChild("invoicesScroll") invoicesScroll: ElementRef;
    @ViewChild("avatar", {read: AvatarPickerComponent}) avatar: AvatarPickerComponent;

    @HostBinding("class.mobile") get mobile() { return this._window.isMobile(); }

    readonly PREFERENCES_KEY = "invoiceHistoryPreferences";

    readonly sortOptions: SortOption[] = [
        new SortOption("Creation", "creationDate"),
        new SortOption("Status", "status"),
        new SortOption("Req. Amount", "amount.requested"),
        new SortOption("Paid Amount", "amount.received,amount.pending"),
        new SortOption("Src. Currency", "sourceCurrency"),
        new SortOption("Op. Currency", "operationCoin"),
        new SortOption("Expiry", "expires.date")
    ];
    sortDirection: "asc" | "desc" = "desc";
    
    onViewInitTaskQueue: Array<() => void> = [];

    filters: FormGroup = new FormGroup({
        search: new FormControl(),
        coins: new FormControl(this.currencyService.getCoins(), Validators.required),
        sort: new FormControl(this.sortOptions[0]),
        startDate: new FormControl(),
        endDate: new FormControl()
    }, {validators: this.validateTimeRange});

    create: FormGroup = new FormGroup({
        name: new FormControl("", [Validators.required, Validators.minLength(2), Validators.maxLength(25)]),
        sourceCurrency: new FormControl(this.currencyService.getFiatCurrencies()[0], Validators.required),
        availableCoins: new FormControl(this.currencyService.getCoins(), Validators.required),
        amount: new FormControl("", [Validators.required, Validators.max(10**10)]),
        lifetime: new FormControl(60, [Validators.required, Validators.min(1), Validators.max(60 * 12)]),
        purpose: new FormControl()
    }, {validators: [this.validateAmount, f => this.validateAvailableCoins(f)]});

    pageSize = 5;
    pageNum = 0;
    totalRecords = 0;
    loading: boolean = false;
    showCreationDialog: boolean = false;
    invoiceLoadingTimeout: number;

    invoices$: BehaviorSubject<Array<InvoiceExt>> = new BehaviorSubject([] as any);
    invoiceCache: Map<string, InvoiceCache> = new Map();

    avatarError?: Error;
    formLoading = true;
    settings: Settings;
    invoiceLoading = false;
    showFilterSidebar = false;
    tooManyError = false;
    imageChanged = false;
    nameChanged = false;

    constructor(private currencyService: CurrencyService,
                private bundle: BundleService,
                private api: ApiService,
                private toast: HotToastService,
                private statistics: StatisticService,
                private router: Router,
                protected _window: WindowComponent) {
        this.restoreState();
        this.filters.valueChanges.subscribe(() => {
            this.saveState();
            if (!this._window.isMobile()) {
                if (!this.filters.valid) return;
                if (this.invoiceLoadingTimeout) {
                    clearTimeout(this.invoiceLoadingTimeout);
                }
                this.invoiceLoadingTimeout = setTimeout(() => this.loadInvoices(), 1500) as any;
            }
        });
        this.create.get("name")?.valueChanges.subscribe(() => {
            this.nameChanged = true;
        });
        this.create.valueChanges.subscribe(() => this.saveState());
        // if (this.settings) {
        //     this.formLoading = false;
        //     return;
        // }
        this.api.getSettings().subscribe(s => {
            if (!this.settings?.name) {
                this.create.get("name")?.setValue(s.name ?? s.id);
            }
            this.settings = s;
            if (this.avatar?.imageBinary) this.formLoading = false;
            this.saveState();
        });
    }

    get uid() {
        return "Office/History";
    }
    
    ngAfterViewInit() {
        this.avatar.ichange.subscribe(() => {
            this.imageChanged = true;
            this.saveState();
        });
        this.onViewInitTaskQueue.forEach(c => {
            try { c() } catch (e) { console.error(e) }
        });
    }

    @HostListener("document:keydown.enter", ['$event'])
    onEnter(event: KeyboardEvent) {
        if (!this.showCreationDialog) return;

        event.preventDefault();
        (document.activeElement as HTMLElement)?.blur();

        this.submitInvoice();
    }

    saveState() {
        this.savePreferences();
        this.bundle.saveInstance(this.uid, {
            filters: this.filters,
            invoices: this.invoices$,
            pageNum: this.pageNum,
            pageSize: this.pageSize,
            totalRecords: this.totalRecords,
            settings: {
                ...this.settings,
                name: this.nameChanged ? this.settings?.name : null
            },
            create: this.create,
            imageBinary: this.imageChanged ? this.avatar?.imageBinary : null
        });
    }

    restoreState() {
        this.loadPreferences();
        const savedInstance = this.bundle.getSavedInstance(this.uid);
        if (!savedInstance) return this.loadInvoices();
        if (savedInstance.filters) this.filters = savedInstance.filters;
        if (savedInstance.totalRecords) this.totalRecords = savedInstance.totalRecords;
        if (savedInstance.pageNum) this.pageNum = savedInstance.pageNum;
        if (savedInstance.pageSize) this.pageSize = savedInstance.pageSize;
        if (savedInstance.settings) this.settings = savedInstance.settings;
        if (savedInstance.create) this.create = savedInstance.create;
        if (savedInstance.imageBinary) {
            this.onViewInitTaskQueue.push(() => this.avatar.setImage(savedInstance.imageBinary));
        }
        if (savedInstance.invoices) this.invoices$ = savedInstance.invoices;
        else this.loadInvoices();
    }

    loadPreferences() {
        try {
            const json = localStorage.getItem(this.PREFERENCES_KEY) || "{}";
            const preferences: Preferences = JSON.parse(json);

            if (preferences.coins) {
                preferences.coins = preferences.coins
                    .map(coin => this.currencyService.findCoinByShortName(coin.shortName))
                    .filter(v => !!v);
                this.filters.get("coins")?.setValue(preferences.coins);
            }

            if (preferences.sort) {
                this.filters.get("sort")?.setValue(preferences.sort);
            }

            if (preferences.sortDirection) {
                this.sortDirection = preferences.sortDirection;
            }

            if (preferences.startDate) {
                this.filters.get("startDate")?.setValue(new Date(preferences.startDate as number));
            }

            if (preferences.endDate) {
                this.filters.get("endDate")?.setValue(new Date(preferences.endDate as number));
            }
        } catch (e) {
            console.error(e);
        }
    }

    savePreferences() {
        if (!this.filters.valid) return;
        const preferences: Preferences = {
            coins: this.filters.get("coins")!.value,
            sort: this.filters.get("sort")!.value,
            sortDirection: this.sortDirection,
            startDate: (this.filters.get("startDate")!.value as Date)?.getTime(),
            endDate: (this.filters.get("endDate")!.value as Date)?.getTime()
        };
        localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    }

    loadInvoices() {
        if (!this.filters.valid) return;
        const coinsStr = (this.filters.get("coins")!.value as Coin[])
            .map(coin => coin.shortName)
            .join(", ");
        let filter = `(operationCoin=in=(${coinsStr}),availableCoins=in=(${coinsStr}))`;

        const isoDateWithoutTimeZone = (date: Date) => {
            if (date == null) return date;
            const unix = date.getTime() - date.getTimezoneOffset() * 60000;
            const utc = new Date(unix);
            utc.setUTCHours(0, 0, 0, 0);
            return utc.toISOString();
        };

        if (this.filters.get("startDate")?.value) {
            const startDate = isoDateWithoutTimeZone(this.filters.get("startDate")!.value as Date);
            filter += `;creationDate>=${startDate}`;
        }
        if (this.filters.get("endDate")?.value) {
            const endDate = isoDateWithoutTimeZone(this.filters.get("endDate")!.value as Date);
            filter += `;creationDate<=${endDate}`;
        }

        let sort = (this.filters.get("sort")!.value as SortOption).value;
        if (sort && sort.toLowerCase() != "creationDate") {
            sort += ",creationDate";
        }

        const search = this.filters.get("search")!.value as string;

        this.invoices$ = new BehaviorSubject([] as any);
        this.loading = true;
        this.api.getAllInvoices(
            this.pageNum, this.pageSize,
            sort, this.sortDirection,
            search, filter, ["availableCoins", "operationCoin", "exchangeRate"]
        ).pipe(map(res => {
            this.totalRecords = res.items.total;
            this.loading = false;
            return res.body;
        }), tap(invoices => {
            this.invoices$.next(invoices);
            this.invoiceCache.clear();
            this.saveState();
        })).subscribe();
    }

    switchSortDirection() {
        this.sortDirection = this.sortDirection == "asc" ? "desc" : "asc";
        if (this.invoiceLoadingTimeout) clearTimeout(this.invoiceLoadingTimeout);
        if (!this._window.isMobile()) this.loadInvoices();
        this.saveState();
    }

    reset() {
        this.sortDirection = "desc";
        this.filters.reset({
            search: undefined,
            coins: this.currencyService.getCoins(),
            sort: this.sortOptions[0],
            startDate: undefined,
            endDate: undefined
        });
        this.saveState();
    }

    onPageChange(e: PaginatorState) {
        this.pageNum = e.page!;
        this.pageSize = e.rows!;
        this.loadInvoices();
    }

    switchInvoice(invoice: InvoiceExt) {
        if (invoice.loading) return;
        if (invoice.expanded) {
            invoice.expanded = false;
            this.animateToHeight(invoice.element!, this.invoiceCreate.nativeElement.offsetHeight);
            return;
        }
        invoice.loading = true;
        this.loadInvoice(invoice).subscribe(loaded => {
            requestAnimationFrame(() => {
                try {
                    this.expandInvoice(loaded);
                } catch (_) { /* empty */ }
            });
        });
    }

    expandInvoice(invoice: InvoiceExt) {
        invoice.loading = false;
        invoice.expanded = true;
        this.animateToHeight(invoice.element!, invoice.element!.offsetHeight + (invoice?.meta?.purpose ? 115 : 90) +
            20 * (invoice.relatedTransactions?.length || 1));
    }

    loadInvoice(invoice: InvoiceExt): Observable<InvoiceExt> {
        let cache = this.invoiceCache.get(invoice.id);
        if (cache && cache.cacheExpiry.getTime() < Date.now()) {
            this.invoiceCache.delete(cache.id);
            cache = undefined;
        }

        const invoiceObs = cache ? of(cache!)
            : this.api.getInvoice(invoice.id).pipe(map(inv => inv as InvoiceExt), tap(
                inv => this.invoiceCache.set(
                    invoice.id, {...inv, cacheExpiry: new Date(Date.now() + 15_000)})));

        return invoiceObs.pipe(take(1), map(loaded => {
            loaded.loading = invoice.loading;
            loaded.expanded = invoice.expanded;
            this.invoices$.next([...this.invoices$.value.map(_invoice => {
                if (_invoice.id == invoice.id) return loaded;
                else return _invoice;
            })]);
            this.saveState();
            return loaded;
        }));
    }

    onAvatarLoaded() {
        if (this.settings) this.formLoading = false;
    }

    submitInvoice() {
        if (!this.create.valid) return;
        this.invoiceLoading = true;
        const name = this.create.get("name")?.value;
        const sourceCurrency = this.create.get("sourceCurrency")?.value;
        const availableCoins = this.create.get("availableCoins")?.value;
        const lifetime = this.create.get("lifetime")?.value;
        const image = this.avatar.imageBinary;
        this.api.createInvoice(
            this.create.get("amount")?.value,
            sourceCurrency,
            availableCoins,
            lifetime,
            name,
            image,
            this.create.get("purpose")?.value
        ).pipe(catchError(err => {
            this.tooManyError = true;
            this.invoiceLoading = false;
            return throwError(() => err);
        })).subscribe(() => {
            this.statistics.aggregate$.next(null as any);
            this.statistics.operationSum$.next(null as any);
            this.statistics.count$.next(null as any);
            this.invoiceLoading = false;
            this.showCreationDialog = false;
            this.tooManyError = false;
            this.create.reset({
                name: name,
                sourceCurrency: sourceCurrency,
                availableCoins: availableCoins,
                amount: null,
                lifetime: lifetime
            });
            this.loadInvoices();
        });
    }

    protected switchFiltersSidebar() {
        this.showFilterSidebar = !this.showFilterSidebar;
        if (!this.showFilterSidebar) {
            this.loadInvoices();
        }
    }

    protected copyInvoiceId(invoice: Invoice) {
        this.copy(invoice.id, invoice.id, "Id");
    }

    protected copyInvoiceLink(invoice: Invoice) {
        this.copy(`https://pecuniawallet.com/invoices?id=${invoice.id}`, invoice.id, "Link");
    }

    protected getInvoiceExpiry(invoice: Invoice): [string, Date | null, string] {
        if (!invoice.expires) return ["invoice expired.", null, ""];
        else return ["expires", invoice.expires.date, this.formatTimeOffset(invoice.expires.date)];
    }

    protected onInvoiceLoaded(invoice: InvoiceExt, element: HTMLElement) {
        invoice.element = element;
        if (invoice.expanded) this.expandInvoice(invoice);
    }

    protected getInvoiceStatus(inv: Invoice): "success" | "fail" | "warn" | "pending" {
        return inv.status == "completed" ? "success"
            : inv.status == "pending" || inv.status == "staggering" ? "pending"
                : inv.status == "overpaid" ? "warn" : "fail";
    }

    protected getInvoiceDisplayStatus(inv: Invoice): string {
        if (inv.status == "completed") return "Completed";
        if (inv.status == "pending" || inv.status == "staggering") return "Pending";
        if (inv.status == "overpaid") return "Overpaid";
        if (inv.status == "expired") return "Expired";
        return "I'm a stub :)";
    }

    protected amount(type: "requested" | "received" | "pending", inv: Invoice) {
        const amount = inv.amount[type];
        const currency = this.currencyService.findCurrencyByShortName(inv.sourceCurrency)!;
        return dp(amount, currency.decimals);
    }

    protected getInvoicePaymentInfo(invoice: Invoice): [string, string] {
        let left: string = "";
        let right: string = "";
        if (invoice.amount.received.plus(invoice.amount.pending).gt(new BigNumber("0"))) {
            left = invoice.status == "completed" ? "paid as" : invoice.amount.received.gt("0") ? "received" : "pend";
            const amount = invoice.amount.received.gt("0") ? invoice.amount.received : invoice.amount.pending;
            const opCoin = this.currencyService.findCoinByShortName(invoice.operationCoin);
            const opAmount = dp(amount.div(invoice.exchangeRate!), opCoin?.decimals ?? 8);
            right = "~" + opAmount + " " + invoice.operationCoin?.toUpperCase();
        } else if (invoice.status != "expired") {
            left = "waiting for";
            if (invoice.operationCoin) {
                right = invoice.operationCoin.toUpperCase();
            } else if (invoice.availableCoins?.length == this.currencyService.getCoins().length) {
                right = "any coin";
            } else if (invoice.availableCoins) {
                for (let i = 0; i < invoice.availableCoins!.length; i++) {
                    if (i > 0) {
                        right += i != (invoice.availableCoins!.length - 1) ? ", " : " or ";
                    }
                    right += invoice.availableCoins![i].toUpperCase();
                }
            } else {
                right = "";
                left = "";
            }
        }
        return [left, right];
    }

    protected copyTxId(id: string) {
        window.navigator.clipboard.writeText(id).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `tx${id}IdCopied`
            });
        });
    }

    protected navToTx(invoice: Invoice, id: string) {
        // localStorage.setItem(`lastVisitedWalletRoute`, "/wallet/coin/tx");
        // localStorage.setItem(`lastVisitedWalletQueryParams`, `{id: ${id}, n: ${invoice.operationCoin}`);
        this.router.navigate(["/wallet/coin/tx"], {
            queryParams: {id: id, n: invoice.operationCoin}
        });
    }

    private copy(text: string, invoice: string, id: string) {
        window.navigator.clipboard.writeText(text).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `invoice${invoice}${id}Copied`
            });
        });
    }

    private validateTimeRange(group: AbstractControl): ValidationErrors | null {
        const startControl = group.get("startDate");
        const endControl = group.get("endDate");

        if (!startControl || !endControl) return null;

        const start = startControl.value;
        const end = endControl.value;

        startControl.setErrors(null);
        endControl.setErrors(null);

        if (!start || !end) return null;

        if (new Date(start) >= new Date(end)) {
            const error = {impossibleTimeRange: true};
            startControl.setErrors(error);
            endControl.setErrors(error);
            return error;
        }

        return null;
    }

    private validateAmount(group: AbstractControl): ValidationErrors | null {
        const sourceCurrency = group.get("sourceCurrency")?.value;
        const amountControl = group.get("amount");

        if (!amountControl?.value) return {badAmount: true};

        if (amountControl.value < 10**(-1 * sourceCurrency.decimals)) {
            const error = {badAmount: true};
            amountControl.setErrors(error);
            return error;
        }

        return null;
    }

    private validateAvailableCoins(group: AbstractControl): ValidationErrors | null {
        const sourceCurrency = group.get("sourceCurrency")?.value?.shortName;
        const availableCoinsControl = group.get("availableCoins");

        if (!sourceCurrency) return null;

        const isSourceCrypto = !!this.currencyService.findCoinByShortName(sourceCurrency);

        if (!isSourceCrypto) return null;
        if (!availableCoinsControl?.value) return {illegalCoins: true};

        const availableCoins: Coin[] = availableCoinsControl.value;
        if (!availableCoins.find(c => c.shortName.toLowerCase() == sourceCurrency.toLowerCase())) {
            const error = {illegalCoins: true};
            availableCoinsControl.setErrors(error);
            return error;
        }

        return null;
    }

    private formatTimeOffset(date: Date): string {
        const diff = date.getTime() - new Date().getTime();
        const minutes = Math.round(Math.abs(diff) / 60000);
        const offset =
            minutes < 60
                ? `${diff >= 0 ? 'in ' : ''}${minutes} min${diff < 0 ? ' ago' : ''}`
                : `${diff >= 0 ? 'in ' : ''}${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}${diff < 0 ? ' ago' : ''}`;
        return `${offset}`;
    }

    private animateToHeight(element: HTMLElement, height: number) {
        const src = element.offsetHeight;
        element.animate([
            {height: element.offsetHeight + "px"},
            {height: height + "px"}
        ], {
            easing: "ease-in-out",
            fill: "forwards",
            duration: height > src ? 300 : 150
        });
        setTimeout(() => {
            const scroll = this.invoicesScroll.nativeElement;
            scroll.style.scrollBehavior = "smooth";
            scroll.scrollBy(0, (height - src) + 20 * (height > src ? 1 : -1));
        }, height > src ? 300 : 1)
    }

    protected pow(a: number, b: number): number {
        return a**b;
    }

    protected readonly y2025 = new Date(2025, 0);
    protected readonly now = new Date();
    protected readonly faRotateRight = faRotateRight;
    protected readonly faArrowUp = faArrowUp;
    protected readonly faArrowDown = faArrowDown;
    protected readonly faPlus = faPlus;
    protected readonly faRotate = faRotate;
    protected readonly faCheck = faCheck;
    protected readonly faXmark = faXmark;
    protected readonly faCopy = faCopy;
    protected readonly faChevronDown = faChevronDown;
    protected readonly faSpinner = faSpinner;
    protected readonly faFilter = faFilter;
    protected readonly faLink = faLink;
}
