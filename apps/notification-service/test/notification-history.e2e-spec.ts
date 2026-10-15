import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";
import { Producer } from "kafkajs";

import { ACCESS_TOKEN_ERROR_CODES } from "@libs/common";
import { TransferCompletedEvent, WALLET_TOPICS } from "@libs/contracts";
import { eventually } from "@libs/testing";

import { api, API_PREFIX, getHistory } from "./helpers/api";
import { buildTransferEvent } from "./helpers/build-event";
import { createTestApp } from "./helpers/create-test-app";
import { createProducer, publish } from "./helpers/kafka";

const TOPIC = WALLET_TOPICS.TRANSFER_COMPLETED;

describe("Notification history (e2e)", () => {
    let app: INestApplication;
    let producer: Producer;

    beforeAll(async () => {
        app = await createTestApp();
        producer = await createProducer();
    });

    afterAll(async () => {
        await producer?.disconnect();
        await app?.close();
    });

    // уведомления создаем через kafka, как в проде, и ждем, пока сервис
    // их сохранит
    const receiveTransfers = async (
        userId: string,
        count: number,
    ): Promise<TransferCompletedEvent[]> => {
        const key = randomUUID();
        const events = Array.from({ length: count }, () =>
            buildTransferEvent({ toUserId: userId }),
        );

        for (const event of events) {
            await publish(producer, TOPIC, key, event);
        }

        await eventually(async () => {
            expect((await getHistory(app, userId)).data).toHaveLength(count);
        });

        return events;
    };

    describe("Negative tests", () => {
        it("Rejects a request without an access token", async () => {
            const response = await api(app)
                .get(`${API_PREFIX}/notifications`)
                .expect(401);

            expect(response.body).toMatchObject({
                code: ACCESS_TOKEN_ERROR_CODES.TOKEN_INVALID,
            });
        });

        it("Does not show notifications of other users", async () => {
            await receiveTransfers(randomUUID(), 1);

            expect(await getHistory(app, randomUUID())).toEqual({
                data: [],
                nextCursor: null,
            });
        });
    });

    describe("Positive tests", () => {
        it("Returns notifications newest first, page by page", async () => {
            const userId = randomUUID();
            const [first, second, third] = await receiveTransfers(userId, 3);

            const firstPage = await getHistory(app, userId, { limit: 2 });
            expect(firstPage.data.map(({ id }) => id)).toEqual([
                third.eventId,
                second.eventId,
            ]);
            expect(firstPage.nextCursor).not.toBeNull();

            const secondPage = await getHistory(app, userId, {
                limit: 2,
                cursor: firstPage.nextCursor as string,
            });
            expect(secondPage.data.map(({ id }) => id)).toEqual([
                first.eventId,
            ]);
            expect(secondPage.nextCursor).toBeNull();
        });
    });
});
