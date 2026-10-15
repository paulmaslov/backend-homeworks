import { generateKeyPairSync, randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";

import { ACCESS_TOKEN_ERROR_CODES } from "@libs/common";

import { createTestApp } from "./helpers/create-test-app";
import {
    connectSocket,
    waitForConnect,
    waitForConnectError,
    waitForDisconnect,
} from "./helpers/socket";
import { signAccessToken } from "./helpers/tokens";

const { privateKey: foreignKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
});

describe("WebSocket authentication (e2e)", () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestApp();
    });

    afterAll(async () => {
        await app?.close();
    });

    describe("Negative tests", () => {
        it.each([
            ["without a token", undefined],
            [
                "with a token signed by another key",
                signAccessToken(randomUUID(), { privateKey: foreignKey }),
            ],
        ])("Rejects a connection %s", async (_, token) => {
            const socket = connectSocket(app, token);

            try {
                const error = await waitForConnectError(socket);
                expect(error.data).toEqual({
                    code: ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
                });
            } finally {
                socket.disconnect();
            }
        });

        it("Disconnects the client when the access token expires", async () => {
            // создаем короткоживущий токен, чтобы времени хватило только
            // на подключение и чтобы он быстро истек
            const socket = connectSocket(
                app,
                signAccessToken(randomUUID(), { expiresInSeconds: 2 }),
            );

            try {
                await waitForConnect(socket);

                // io server disconnect - соединение закрыл сервер, а не
                // клиент или сеть
                expect(await waitForDisconnect(socket)).toBe(
                    "io server disconnect",
                );
            } finally {
                socket.disconnect();
            }
        });
    });
});
