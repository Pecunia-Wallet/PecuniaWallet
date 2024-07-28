import {getCryptoInstance, sha512} from "./crypto.util";

describe("CryptoUtils", () => {
    const testSrc = "test-src";
    const testKey = "test-key";
    const testSalt = "test-salt";
    const encryptedWithSalt = "Y2I5YmYzODgwNWZjMjAzN2FjYTk3MWVlNzY4YTQwY2I=";
    const encryptedWithNoSalt = "MjY2YTdkNGY3NTE2N2M1ZTg0NGQxNDM1ZDEwZDk3M2Q=";

    it("should return instance", async () => {
        expect(await getCryptoInstance("test", "test")).toBeTruthy();
    });

    it("hash should be const", async () => {
        expect(await sha512(testSrc)).toEqual(await sha512(testSrc));
    }, 10_000);

    it("should normally encrypt w/o salt", async () => {
        expect(await (await getCryptoInstance(testSrc, testKey)).encrypt())
            .toEqual(encryptedWithNoSalt);
    }, 20_000);

    it("should normally decrypt w/o salt", async () => {
        expect(await (await getCryptoInstance(encryptedWithNoSalt, testKey)).decrypt())
            .toEqual(testSrc);
    }, 20_000);

    it("should normally encrypt with salt", async () => {
        expect(await (await getCryptoInstance(testSrc, testKey, testSalt)).encrypt())
            .toEqual(encryptedWithSalt);
    }, 20_000);

    it("should normally decrypt with salt", async () => {
        expect(await (await getCryptoInstance(encryptedWithSalt, testKey, testSalt)).decrypt())
            .toEqual(testSrc);
    }, 20_000);
});
