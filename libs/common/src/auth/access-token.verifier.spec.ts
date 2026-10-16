import { createHmac, generateKeyPairSync } from "node:crypto";

import { JwtService } from "@nestjs/jwt";

import { JWT_ACCESS_ALGORITHM } from "@libs/contracts";

import {
    ACCESS_TOKEN_ERROR_CODES,
    AccessTokenErrorCode,
} from "./access-token.constants";
import { AccessTokenError } from "./access-token.error";
import { AccessTokenVerifier } from "./access-token.verifier";

const generateKeys = () =>
    generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

const ownKeys = generateKeys();
const foreignKeys = generateKeys();
const jwtService = new JwtService();
const verifier = new AccessTokenVerifier(jwtService, {
    publicKey: ownKeys.publicKey,
});

const toBase64Url = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

const nowInSeconds = (): number => Math.floor(Date.now() / 1000);

const sign = (payload: object, privateKey = ownKeys.privateKey): string =>
    jwtService.sign(payload, {
        privateKey,
        algorithm: JWT_ACCESS_ALGORITHM,
        expiresIn: 900,
    });

const signWithoutExpiresIn = (payload: object): string =>
    jwtService.sign(payload, {
        privateKey: ownKeys.privateKey,
        algorithm: JWT_ACCESS_ALGORITHM,
    });

const rejectionCode = (
    token: string | undefined,
): AccessTokenErrorCode | undefined => {
    try {
        verifier.verify(token);
    } catch (error) {
        if (error instanceof AccessTokenError) {
            return error.data.code;
        }
        throw error;
    }
    return undefined;
};

describe("AccessTokenVerifier", () => {
    it("Returns the user from a valid token", () => {
        const token = sign({ sub: "user-1" });

        const user = verifier.verify(token);

        expect(user.userId).toBe("user-1");
        expect(user.tokenExpiresAt).toBeGreaterThan(Date.now());
    });

    it("Rejects an expired token with TOKEN_EXPIRED", () => {
        const token = signWithoutExpiresIn({
            sub: "user-1",
            exp: nowInSeconds() - 10,
        });

        expect(rejectionCode(token)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_EXPIRED,
        );
    });

    it("Rejects a missing token", () => {
        expect(rejectionCode(undefined)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });

    it("Rejects a token without expiration", () => {
        const token = signWithoutExpiresIn({ sub: "user-1" });

        expect(rejectionCode(token)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });

    it("Rejects a token signed with another key", () => {
        const token = sign({ sub: "user-1" }, foreignKeys.privateKey);

        expect(rejectionCode(token)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });

    it("Rejects a token with a changed payload", () => {
        const [header, , signature] = sign({ sub: "user-1" }).split(".");
        const payload = toBase64Url({
            sub: "user-2",
            exp: nowInSeconds() + 900,
        });

        expect(rejectionCode(`${header}.${payload}.${signature}`)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });

    it("Rejects an unsigned token", () => {
        const header = toBase64Url({ alg: "none", typ: "JWT" });
        const payload = toBase64Url({
            sub: "user-2",
            exp: nowInSeconds() + 900,
        });

        expect(rejectionCode(`${header}.${payload}.`)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });

    // не принимаем токен с подменой алгоритма
    it("Rejects an HS256 token signed with the public key", () => {
        const header = toBase64Url({ alg: "HS256", typ: "JWT" });
        const payload = toBase64Url({
            sub: "user-2",
            exp: nowInSeconds() + 900,
        });
        const signature = createHmac("sha256", ownKeys.publicKey)
            .update(`${header}.${payload}`)
            .digest("base64url");

        expect(rejectionCode(`${header}.${payload}.${signature}`)).toBe(
            ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
        );
    });
});
