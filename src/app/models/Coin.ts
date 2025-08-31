export interface Coin {
    shortName: string;
    fullName: string;
    imageUri: string;
    decimals: number;
    unitName: string;
    symbol: string;
    color: string;
    requiredConfirmations: number;
    explorer: string;
    defaultAddressType?: string;
}
