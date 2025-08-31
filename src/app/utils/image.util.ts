export const detectImageMime = (bytes: Uint8Array): string => {
    if (bytes.length < 3) return "";

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
    ) {
        return "image/png";
    }

    // JPEG: FF D8 FF
    if (
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
    ) {
        return "image/jpeg";
    }

    // GIF: 47 49 46 38 ('GIF8')
    if (
        bytes[0] === 0x47 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x38
    ) {
        return "image/gif";
    }

    // WebP: 'RIFF' .... 'WEBP'
    if (
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return "image/webp";
    }

    // AVIF: Similar to HEIF
    if (
        bytes[4] === 0x66 && // 'f'
        bytes[5] === 0x74 && // 't'
        bytes[6] === 0x79 && // 'y'
        bytes[7] === 0x70    // 'p'
    ) {
        const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        if (brand === "avif" || brand === "avis") {
            return "image/avif";
        }
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 100)).toLowerCase();
    if (text.includes("<svg")) {
        return "image/svg+xml";
    }

    return "";
}