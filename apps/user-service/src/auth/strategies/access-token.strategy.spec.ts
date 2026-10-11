import { generateKeyPairSync } from "node:crypto";

import { ConfigService } from "@nestjs/config";

import { AccessTokenStrategy } from "./access-token.strategy";

describe("AccessTokenStrategy", () => {
    it("Maps the JWT payload to the current user (userId from sub)", () => {
        const { privateKey } = generateKeyPairSync("rsa", {
            modulusLength: 2048,
            privateKeyEncoding: { type: "pkcs8", format: "pem" },
            publicKeyEncoding: { type: "spki", format: "pem" },
        });
        const config = {
            getOrThrow: jest.fn().mockReturnValue(privateKey),
        } as unknown as ConfigService;

        const strategy = new AccessTokenStrategy(config);

        expect(strategy.validate({ sub: "user-1" })).toEqual({
            userId: "user-1",
        });
    });
});
