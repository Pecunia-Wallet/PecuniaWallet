import {Component, OnInit} from "@angular/core";
import {LoaderComponent} from "../loader/loader.component";
import {WalletHeaderComponent} from "../wallet-header/wallet-header.component";
import {WalletService} from "../../../services/wallet.service";
import {Coin} from "../../../models/Coin";
import {ActivatedRoute, Router} from "@angular/router";
import {ApplyDirective} from "../../../directives/apply.directive";
import {FormControl, ReactiveFormsModule} from "@angular/forms";
import {validate} from "multicoin-address-validator";
import BigNumber from "bignumber.js";
import {NgIf} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowLeft, faArrowRight} from "@fortawesome/free-solid-svg-icons";
import {dp, getCoinName, testnet} from "../../../app.config";
import {BundleService} from "../../../services/bundle.service";
import {BrokerService} from "../../../services/broker.service";

interface UriParseError {
    malformed?: true;
    invalidNetwork?: true;
    invalidAddress?: true;
    invalidAmount?: true;
}

interface UriParseResult {
    network?: string;
    address?: string;
    amount?: string;
    label?: string;
    message?: string;
}

@Component({
    selector: "app-request-reader",
    standalone: true,
    imports: [
        LoaderComponent,
        WalletHeaderComponent,
        ApplyDirective,
        ReactiveFormsModule,
        NgIf,
        FaIconComponent
    ],
    templateUrl: "./request-reader.component.html",
    styleUrl: "./request-reader.component.scss"
})
export class RequestReaderComponent implements OnInit {

    loading = true;

    coin: Coin;

    request = new FormControl("");
    parsed: UriParseResult & UriParseError = {};

    readonly reAmount = /^(([\d.]+)(X(\d+))?|x([\da-f]*)(\.([\da-f]*))?(X([\da-f]+))?)$/i;

    constructor(private wallet: WalletService,
                private route: ActivatedRoute,
                private bundle: BundleService,
                private router: Router,
                private broker: BrokerService) {}

    get uid() {
        return `Wallet/Request/Read:${getCoinName(this.route)}`;
    }

    ngOnInit() {
        this.wallet.currentCoin(this.route).subscribe(coin => {
            this.coin = coin!;
            this.loading = false;
        });

        this.request.valueChanges.subscribe(v => {
            this.request.setValue((v || "").trim(), { emitEvent: false });
            this.bundle.saveInstance(this.uid, {
                request: this.request.value
            });
            this.parseRequest(this.request.value);
        });

        const savedInstance = this.bundle.getSavedInstance(this.uid);
        if (savedInstance?.request) {
            this.request.setValue(savedInstance.request, {emitEvent: false});
            this.parseRequest();
        }
    }

    parseRequest(request?: string | null) {
        if (!request) request = this.request.value;
        if (!request) return (this.parsed = {}) as unknown as void;

        this.parsed = this.parseBitcoinUri(request);
    }

    parseBitcoinUri(uri: string): UriParseResult & UriParseError {
        const regex = /^([a-zA-Z]+):([a-zA-Z0-9]*)([;?]|$)/;
        const match = uri.match(regex);
        let error: UriParseError = {};

        if (!match) return {malformed: true};

        const network = match[1];
        if (network !== "bitcoin") error["invalidNetwork"] = true;

        const address = match[2];

        if (!validate(address, this.coin.shortName.toLowerCase(), {
            networkType: testnet ? "testnet" : "prod"
        })) error["invalidAddress"] = true;

        let amount: string | undefined;
        let label: string | undefined;
        let message: string | undefined;

        const paramsString = uri.slice(match[0].length);
        if (paramsString) {
            const params = paramsString.split("&");
            for (const param of params) {
                const [key, value] = param.split("=");
                if (!value) continue;
                switch (key) {
                    case "amount":
                        amount = value;
                        break;
                    case "label":
                        label = decodeURIComponent(value);
                        break;
                    case "message":
                        message = decodeURIComponent(value);
                        break;
                }
            }
        }

        if (amount) {
            try { amount = this.parseAmount(amount) as any; } catch (_) {}
            if (!amount || !(amount as any instanceof BigNumber)) error["invalidAmount"] = true;
        }
        return {...error, network, address, amount, label, message};
    }

    /**
     * @link https://github.com/bitcoin/bips/blob/master/bip-0020.mediawiki
     */
    parseAmount(txt: string): BigNumber | undefined | string {
        const m = txt.match(this.reAmount);
        if (!m) return undefined;

        let res;
        if (m[5]) {
            const part1 = new BigNumber(m[5], 16);
            const part2 = m[7] ? new BigNumber(m[7], 16).dividedBy(new BigNumber(16).pow(m[7].length)) : new BigNumber(0);
            const multiplier = m[9] ? new BigNumber(16).pow(parseInt(m[9], 16)) : new BigNumber(0x10000);
            res = part1.plus(part2).multipliedBy(multiplier).div(1e8);
        } else {
            const base = new BigNumber(m[2]);
            const exponent = m[4] ? new BigNumber(10).pow(m[4]) : new BigNumber(1e8);
            res = base.multipliedBy(exponent).div(1e8);
        }
        if (!res || res.toString() == "NaN") return txt;
        return res;
    }

    get canPass() {
        return ((!this.parsed.invalidAddress || !this.parsed.invalidAmount) &&
            this.parsed.amount || this.parsed.address) && !this.parsed.invalidNetwork;
    }

    confirm() {
        this.bundle.saveInstance(this.uid, null);
        const data: any = {};
        if (!this.parsed.invalidAddress && this.parsed.address)
            data["address"] = this.parsed.address;
        if (!this.parsed.invalidAmount && this.parsed.amount)
            data["amount"] = this.parsed.amount;
        this.broker.data.parsedRequest = data;
        this.router.navigate(["/wallet/coin/send"], {
            queryParamsHandling: "merge"
        });
    }

    protected readonly faArrowLeft = faArrowLeft;
    protected readonly faArrowRight = faArrowRight;
    protected readonly dp = dp;
    protected readonly BigNumber = BigNumber;
}
