import { deflate, inflate } from 'pako';

const EXPIRE_HOURS = 24;

export function encodeShareData(data) {
    try {
        const payload = {
            ...data,
            expiresAt: Date.now() + EXPIRE_HOURS * 60 * 60 * 1000,
        };
        const jsonString = JSON.stringify(payload);
        const compressed = deflate(jsonString);
        
        // Convert Uint8Array to a binary string
        let binaryString = '';
        const len = compressed.length;
        for (let i = 0; i < len; i++) {
            binaryString += String.fromCharCode(compressed[i]);
        }
        
        // Base64 encode and make it URL-safe
        return btoa(binaryString)
            .replace(/\+/g, '-') // Replace + with -
            .replace(/\//g, '_') // Replace / with _
            .replace(/=/g, '');  // Remove padding =
    } catch (error) {
        console.error("Failed to encode share data:", error);
        return null;
    }
}

export function decodeShareData(encodedData) {
    try {
        // Restore URL-safe Base64 to standard Base64
        let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }

        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const jsonString = inflate(bytes, { to: 'string' });
        const data = JSON.parse(jsonString);

        if (data.expiresAt && Date.now() > data.expiresAt) {
            console.warn("Share link has expired.");
            return { expired: true };
        }

        return data;
    } catch (error) {
        console.error("Failed to decode share data:", error);
        return null;
    }
}
