import { generateKeyPairSync } from "node:crypto";

export interface RsaKeyPair {
    publicKey: string;
    privateKey: string;
}

export function generateRsaKeyPair(): RsaKeyPair {
    return generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "pem" },
    });
}
