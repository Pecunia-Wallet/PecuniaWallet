import {AfterViewInit, Component, OnInit, ViewChild} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {LoaderComponent} from "../loader/loader.component";
import {
    faArrowLeft,
    faCopy,
    faInfo,
    faLongArrowAltDown,
    faPenToSquare,
    faShareNodes
} from "@fortawesome/free-solid-svg-icons";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {NgxQrcodeStylingComponent, Options} from "ngx-qrcode-styling";
import {WalletService} from "../../../services/wallet.service";
import {Coin} from "../../../models/Coin";
import {Observable} from "rxjs";
import {faClipboard} from "@fortawesome/free-regular-svg-icons";
import {DomSanitizer} from "@angular/platform-browser";
import {NotifyService} from "../../../services/notify.service";
import BigNumber from "bignumber.js";
import {NgIf} from "@angular/common";
import {dp} from "../../../app.config";
import {HotToastService} from "@ngxpert/hot-toast";
import {Ripple} from "primeng/ripple";

@Component({
    selector: "app-request",
    standalone: true,
    imports: [
        FaIconComponent,
        RouterLink,
        LoaderComponent,
        WalletHeaderComponent,
        NgIf,
        Ripple,
        NgxQrcodeStylingComponent
    ],
    templateUrl: "./request.component.html",
    styleUrl: "./request.component.scss"
})
export class RequestComponent implements OnInit, AfterViewInit {

    @ViewChild("qr") qr: NgxQrcodeStylingComponent;

    qrConfig: Options = {
        width: 164,
        height: 164,
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

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private router: Router,
                private toast: HotToastService) {
    }

    renderQr(): Observable<void> {
        return this.qr.update(this.qrConfig, {
            data: this.request
        });
    }

    ngOnInit() {
        this.coin = this.wallet.currentCoin(this.route)!;
    }

    ngAfterViewInit() {
        this.renderQr().subscribe(() => {
            this.loading = false;
        });
    }

    copy() {
        navigator.clipboard.writeText(this.request!).then(() => {
            this.toast.info("Copied to clipboard!", {
                id: "requestCopied"
            });
        });
    }

    share() {
        window.navigator.share({
            text: `${this.request}`
        });
    }

    edit() {
        this.router.navigate(["/wallet/coin/request/build"], {
            queryParams: {
                restore: true
            },
            queryParamsHandling: "merge"
        });
    }

    get amount(): BigNumber | undefined {
        const amount = this.route.snapshot.queryParamMap.get("amount");
        if (!amount) return undefined;
        return new BigNumber(amount);
    }

    get addr() {
        return this.route.snapshot.queryParamMap.get("addr");
    }

    get label() {
        return this.route.snapshot.queryParamMap.get("label");
    }

    get message() {
        return this.route.snapshot.queryParamMap.get("message");
    }

    get request() {
        if (!this.addr || !this.amount) return undefined;
        let request = `bitcoin:${this.addr}?amount=${this.amount.dp(this.coin.decimals)}`;
        if (this.label) request += `&label=${this.label}`;
        if (this.message) request += `&message=${this.message}`;
        return request;
    }

    protected readonly faCopy = faCopy;
    protected readonly faShareNodes = faShareNodes;
    protected readonly faInfo = faInfo;
    protected readonly decodeURI = decodeURI;
    protected readonly faPenToSquare = faPenToSquare;
    protected readonly dp = dp;
}
