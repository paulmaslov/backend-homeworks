import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";

import {
    KAFKA_HEADERS,
    TransferCompletedEvent,
    WALLET_TOPICS,
} from "@libs/contracts";
import { eventually, readTopic, TopicReader } from "@libs/testing";

import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { findOutboxEvents } from "./helpers/outbox";
import { deposit, registerPair, transfer } from "./helpers/wallet";

describe("Outbox relay (e2e)", () => {
    let app: INestApplication;
    let transferEvents: TopicReader;

    beforeAll(async () => {
        process.env.OUTBOX_RELAY_ENABLED = "true";

        app = await createTestApp();
        await app.listen(0);
        transferEvents = await readTopic(WALLET_TOPICS.TRANSFER_COMPLETED);
    });

    beforeEach(async () => {
        await cleanDatabase(app);
    });

    afterAll(async () => {
        await transferEvents?.stop();
        await app?.close();
    });

    describe("Positive tests", () => {
        it("Publishes a completed transfer to Kafka and removes it from the outbox", async () => {
            const [sender, recipient] = await registerPair(app);
            await deposit(app, sender.accessToken, "100.00");
            const requestId = randomUUID();

            const response = await transfer(
                app,
                sender.accessToken,
                { toUserId: recipient.userId, amount: "40.00" },
                { requestId },
            ).expect(201);
            const { id: transferId, createdAt } = response.body as {
                id: string;
                createdAt: string;
            };

            const message = await transferEvents.waitForMessage(transferId);
            expect(
                JSON.parse(message.value) as TransferCompletedEvent,
            ).toMatchObject({
                transferId,
                fromUserId: sender.userId,
                toUserId: recipient.userId,
                amount: "40.00",
                occurredAt: createdAt,
            });
            // по id запроса связываются логи user-service и notification-service
            expect(message.headers).toMatchObject({
                [KAFKA_HEADERS.REQUEST_ID]: requestId,
            });

            // отправленное событие удаляется, иначе relay отправлял бы его снова
            await eventually(async () => {
                expect(await findOutboxEvents(app)).toEqual([]);
            });
        });
    });
});
