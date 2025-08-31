import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from "@angular/core";
import {LoaderComponent} from "../loader/loader.component";
import {WalletService} from "../../../services/wallet.service";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {Coin} from "../../../models/Coin";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {
    faCopy,
    faChevronLeft,
    faChevronRight, faInfo, faLongArrowAltDown,
    faShareNodes
} from "@fortawesome/free-solid-svg-icons";
import {NgxQrcodeStylingComponent, Options} from "ngx-qrcode-styling";
import {forkJoin, Observable, take, tap} from "rxjs";
import {NgSwitch, NgSwitchCase} from "@angular/common";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {BundleService} from "../../../services/bundle.service";
import {getCoinName} from "../../../app.config";
import {HotToastService} from "@ngxpert/hot-toast";
import {Ripple} from "primeng/ripple";
import {AddressBag} from "wallet-sensitive/dist";
import _default from "chart.js/dist/plugins/plugin.tooltip";
import type = _default.defaults.animations.numbers.type;

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
        NgSwitch,
        NgSwitchCase,
        WalletHeaderComponent,
        Ripple,
        NgxQrcodeStylingComponent
    ],
    templateUrl: "./receive.component.html",
    styleUrl: "./receive.component.scss"
})
export class ReceiveComponent implements AfterViewInit {

    @ViewChild("qr") qr: NgxQrcodeStylingComponent;
    @ViewChild("qrContainer") qrContainer: ElementRef;

    readonly qrConfig: Options = {
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

    readonly addressOrder = [
        "tr",
        "wpkh",
        "wsh",
        "sh",
        "pkh"
    ];

    loading = true;
    coin: Coin;
    addresses: Address[] = [];
    currentAddressIndex = 0;

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private bundle: BundleService,
                private toast: HotToastService) {
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
        this.coin = this.wallet.currentCoin(this.route)!;
        const addresses: Observable<AddressBag> = this.wallet.getAddresses(this.coin!).pipe(take(1));
        addresses.subscribe(addresses => {
            this.addresses = Object.entries(addresses)
                .map(([type, address]) => ({
                    value: address as string,
                    type: type as string
                }))
                .sort((a1: Address, a2: Address) => {
                    const i1 = this.addressOrder.indexOf(a1.type.toLowerCase());
                    const i2 = this.addressOrder.indexOf(a2.type.toLowerCase());

                    if (i1 == i2) return 0;
                    if (i1 == -1 && i2 != -1) return 1;
                    if (i2 == -1) return -1;

                    return i1 - i2;
                });
            this.updateQr().subscribe(_ => this.loading = false);
        })
    }

    prev() {
        const prev = Math.max(0, this.currentAddressIndex - 1);
        if (prev != this.currentAddressIndex) {
            this.currentAddressIndex = prev;
            this.bundle.saveInstance(this.uid, {addressIndex: prev});
            this.updateQr().subscribe();
        }
    }

    next() {
        const next = Math.min(this.addresses.length - 1, this.currentAddressIndex + 1);
        if (next != this.currentAddressIndex) {
            this.currentAddressIndex = next;
            this.bundle.saveInstance(this.uid, {addressIndex: next});
            this.updateQr().subscribe();
        }
    }

    copy() {
        const addr = this.currentAddress!.value;
        navigator.clipboard.writeText(addr).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: `address${addr}Copied`
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
                case "sh": // fallthrough
                case "pkh":
                    page = "/Invoice_address";
                    break;
                case "wsh": // fallthrough
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
