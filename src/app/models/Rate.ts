import {Coin} from "./Coin";
import {FiatCurrency} from "./FiatCurrency";
import BigNumber from "bignumber.js";

/**
 * Coin-to-fiat rate, i.e., cost of the coin in fiat.
 */
export class Rate {
    coin: Coin;
    fiat: FiatCurrency;
    rate: BigNumber;

    constructor(coin?: Coin, fiat?: FiatCurrency, rate?: BigNumber) {
        if (coin) this.coin = coin;
        if (fiat) this.fiat = fiat;
        if (rate) this.rate = rate;
    }
}
