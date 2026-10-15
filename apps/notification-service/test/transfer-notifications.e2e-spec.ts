import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";
import { Producer } from "kafkajs";

import { WALLET_TOPICS } from "@libs/contracts";
import { eventually, readTopic, TopicReader } from "@libs/testing";

import {
    DEAD_LETTER_HEADERS,
    deadLetterTopic,
} from "@notification-service/common/filters/kafka-dead-letter.filter";
import { NOTIFICATION_TYPES } from "@notification-service/features/notification/notification.events";

import { getHistory } from "./helpers/api";
import { buildTransferEvent } from "./helpers/build-event";
import { createTestApp } from "./helpers/create-test-app";
import { createProducer, publish } from "./helpers/kafka";
import {
    connectSocket,
    waitForConnect,
    waitForNotification,
} from "./helpers/socket";
import { signAccessToken } from "./helpers/tokens";

const TOPIC = WALLET_TOPICS.TRANSFER_COMPLETED;

describe("Transfer notifications (e2e)", () => {
    let app: INestApplication;
    let producer: Producer;
    let deadLetters: TopicReader;

    beforeAll(async () => {
        app = await createTestApp();
        producer = await createProducer();
        deadLetters = await readTopic(deadLetterTopic(TOPIC));
    });

    afterAll(async () => {
        await deadLetters?.stop();
        await producer?.disconnect();
        await app?.close();
    });

    const historyOf = async (userId: string) =>
        (await getHistory(app, userId)).data;

    describe("Negative tests", () => {
        it("Moves an invalid event to the dead letter topic and keeps reading the partition", async () => {
            const key = randomUUID();
            const invalid = { ...buildTransferEvent(), amount: 40 };
            const valid = buildTransferEvent();

            await publish(producer, TOPIC, key, invalid);
            await publish(producer, TOPIC, key, valid);

            await eventually(async () => {
                expect(await historyOf(valid.toUserId)).toHaveLength(1);
            });

            expect(await historyOf(invalid.toUserId)).toEqual([]);

            const deadLetter = await deadLetters.waitForMessage(key);
            expect(deadLetter.headers).toMatchObject({
                [DEAD_LETTER_HEADERS.REASON]: "invalid",
                [DEAD_LETTER_HEADERS.ORIGINAL_TOPIC]: TOPIC,
            });
        });

        it("Stores a redelivered event only once", async () => {
            const key = randomUUID();
            const redelivered = buildTransferEvent();
            const nextEvent = buildTransferEvent();

            await publish(producer, TOPIC, key, redelivered);
            await publish(producer, TOPIC, key, redelivered);
            await publish(producer, TOPIC, key, nextEvent);

            await eventually(async () => {
                expect(await historyOf(nextEvent.toUserId)).toHaveLength(1);
            });

            expect(await historyOf(redelivered.fromUserId)).toHaveLength(1);
            expect(await historyOf(redelivered.toUserId)).toHaveLength(1);
        });
    });

    describe("Positive tests", () => {
        it("Pushes the transfer to both participants and stores it in their history", async () => {
            const event = buildTransferEvent();
            const sender = connectSocket(
                app,
                signAccessToken(event.fromUserId),
            );
            const recipient = connectSocket(
                app,
                signAccessToken(event.toUserId),
            );

            try {
                await Promise.all([
                    waitForConnect(sender),
                    waitForConnect(recipient),
                ]);

                // начинаем ждать push до отправки события, чтобы его не пропустить
                const pushes = Promise.all([
                    waitForNotification(sender),
                    waitForNotification(recipient),
                ]);
                await publish(producer, TOPIC, event.transferId, event);
                const [sent, received] = await pushes;

                const transfer = {
                    id: event.eventId,
                    transferId: event.transferId,
                    fromUserId: event.fromUserId,
                    toUserId: event.toUserId,
                    amount: event.amount,
                    occurredAt: event.occurredAt,
                };
                expect(sent).toEqual({
                    ...transfer,
                    type: NOTIFICATION_TYPES.TRANSFER_SENT,
                });
                expect(received).toEqual({
                    ...transfer,
                    type: NOTIFICATION_TYPES.TRANSFER_RECEIVED,
                });

                // сервис сохраняет уведомление до push, поэтому в истории
                // оно уже есть
                expect(await historyOf(event.fromUserId)).toEqual([sent]);
                expect(await historyOf(event.toUserId)).toEqual([received]);
            } finally {
                sender.disconnect();
                recipient.disconnect();
            }
        });
    });
});
