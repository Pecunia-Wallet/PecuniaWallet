import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {LoaderComponent} from "../loader/loader.component";
import {WalletService} from "../../../services/wallet.service";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {Coin} from "../../../models/Coin";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faArrowLeft, faCopy,
    faChevronLeft,
    faChevronRight, faInfo, faLongArrowAltDown,
    faLongArrowDown,
    faShareNodes
} from "@fortawesome/free-solid-svg-icons";
import {NgxQrcodeStylingComponent, NgxQrcodeStylingModule, Options} from "ngx-qrcode-styling";
import {forkJoin, Observable, take, tap} from "rxjs";
import {JsonPipe, NgSwitch, NgSwitchCase} from "@angular/common";
import {NgVarDirective} from "../../../directives/ng-var.directive";
import {faClipboard} from "@fortawesome/free-regular-svg-icons";
import {NotifyService} from "../../../services/notify.service";
import {DomSanitizer} from "@angular/platform-browser";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {BundleService} from "../../../services/bundle.service";
import {getCoinName} from "../../../app.config";

interface Address {
    value: string;
    type: string;
}

@Component({
    selector: "app-receive",
    standalone: true,
    imports: [
        LoaderComponent,
        FaIconComponent,
        RouterLink,
        NgxQrcodeStylingModule,
        JsonPipe,
        NgSwitch,
        NgSwitchCase,
        NgVarDirective,
        WalletHeaderComponent
    ],
    templateUrl: "./receive.component.html",
    styleUrl: "./receive.component.scss"
})
export class ReceiveComponent implements AfterViewInit {

    @ViewChild("qr") qr: NgxQrcodeStylingComponent;
    @ViewChild("qrContainer") qrContainer: ElementRef;

    qrConfig: Options = {
        width: 328,
        height: 328,
        margin: 0,
        qrOptions: {
            errorCorrectionLevel: "M"
        },
        dotsOptions: {
            type: "rounded",
            color: "#2b2e4a"
        },
        cornersSquareOptions: {
            type: "extra-rounded",
            color: "#2b2e4a"
        },
        cornersDotOptions: {
            color: "#2b2e4a"
        }
    };

    loading = true;
    coin: Coin;
    addresses: Address[] = [];
    currentAddressIndex = 0;

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private notify: NotifyService,
                private sanitizer: DomSanitizer,
                private bundle: BundleService) {
        this.restoreState();
    }

    get uid() {
        return `Wallet/ReceiveFunds:${getCoinName(this.route)}`;
    }

    restoreState() {
        const instance = this.bundle.getSavedInstance(this.uid);
        this.currentAddressIndex = instance?.addressIndex || 0;
    }

    get currentAddress(): Address | undefined {
        if (this.currentAddressIndex > this.addresses.length)
            return this.addresses[this.addresses.length - 1];
        return this.addresses[this.currentAddressIndex] || this.addresses[0];
    }

    updateQr(): Observable<void> {
        return this.qr.update(this.qrConfig, {
            data: this.currentAddress!.value
        }).pipe(tap(() => {
            const canvas = this.qrContainer.nativeElement.querySelector("canvas");
            canvas.style.width = "164px";
            canvas.style.height = "164px";
        }));
    }

    ngAfterViewInit() {
        this.wallet.currentCoin(this.route).subscribe(coin => {
            this.coin = coin!;
            this.wallet.getCoinInfo(coin!).subscribe(info => {
                const addresses = forkJoin(info.addressTypes
                    .map(type => this.wallet.getAddress(coin!, type).pipe(take(1))));
                addresses.subscribe(addresses => {
                    this.addresses = addresses.map((address, i) => {
                        return {
                            value: address,
                            type: info.addressTypes[i]
                        }
                    });
                    this.addresses = this.addresses.sort(((a1, a2) => {
                        if (a1.type == info.defaultAddressType) return -1;
                        if (a2.type == info.defaultAddressType) return 1;
                        return 0;
                    }));
                    this.updateQr().subscribe(_ => this.loading = false);
                })
            });
        });
    }

    prev() {
        const prev = Math.max(0, this.currentAddressIndex - 1);
        if (prev != this.currentAddressIndex) {
            this.currentAddressIndex = prev;
            this.bundle.saveInstance(this.uid, { addressIndex: prev });
            this.updateQr().subscribe();
        }
    }

    next() {
        const next = Math.min(this.addresses.length - 1, this.currentAddressIndex + 1);
        if (next != this.currentAddressIndex) {
            this.currentAddressIndex = next;
            this.bundle.saveInstance(this.uid, { addressIndex: next });
            this.updateQr().subscribe();
        }
    }

    copy() {
        navigator.clipboard.writeText(this.currentAddress!.value).then(() => {
            this.notify.notification$.next({
                title: "",
                text: this.sanitizer.bypassSecurityTrustHtml(`
                    <span style="font-weight: 500;font-size: 20px;text-align: left">
                        Address copied
                    </span>
                `),
                icon: faClipboard,
                hideAfter: 2000
            });
        });
    }

    get info(): string {
        if (!this.coin) return "";
        let resource = "";
        let page = "";
        switch (this.coin.shortName.toLowerCase()) {
            case "btc":
                resource = "https://en.bitcoin.it/wiki";
        }
        if (this.coin.shortName.toLowerCase() == "btc") {
            switch (this.currentAddress?.type?.toLowerCase()) {
                case "pkh":
                    page = "/Invoice_address";
                    break;
                case "wpkh":
                    page = "/Segregated_Witness";
            }
        }
        return resource + page;
    }

    async share() {
        window.navigator.share({
            text: `${this.currentAddress!.value}`,
            title: `${this.coin.fullName} address`,
        });
    }

    protected readonly faChevronLeft = faChevronLeft;
    protected readonly faChevronRight = faChevronRight;
    protected readonly faShareNodes = faShareNodes;
    protected readonly faInfo = faInfo;
    protected readonly faLongArrowAltDown = faLongArrowAltDown;
    protected readonly faCopy = faCopy;
}
