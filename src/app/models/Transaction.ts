import BigNumber from "bignumber.js";

export interface Transaction {
    id: string,
    amount: BigNumber,
    fee: BigNumber,
    addresses: string[],
    time: Date,
    confirmations: number
}
