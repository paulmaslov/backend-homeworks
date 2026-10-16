import { ArgumentsHost } from "@nestjs/common";
import { KafkaContext, RpcException } from "@nestjs/microservices";
import { mongo } from "mongoose";
import { PinoLogger } from "nestjs-pino";
import { lastValueFrom } from "rxjs";

import {
    DEAD_LETTER_HEADERS,
    KafkaDeadLetterFilter,
} from "@notification-service/common/filters/kafka-dead-letter.filter";
import { MongoWaitAbortedError } from "@notification-service/providers/databases/mongodb/mongo-retry";

const TOPIC = "wallet.transfer.completed";

describe("KafkaDeadLetterFilter", () => {
    let filter: KafkaDeadLetterFilter;
    let send: jest.Mock;
    let host: ArgumentsHost;

    beforeEach(() => {
        send = jest.fn().mockResolvedValue([]);

        const context = {
            getMessage: () => ({
                key: "transfer-1",
                value: { eventId: "event-1" },
                offset: "42",
                headers: { "x-request-id": "request-1" },
            }),
            getTopic: () => TOPIC,
            getPartition: () => 2,
            getProducer: () => ({ send }),
        } as unknown as KafkaContext;

        host = {
            switchToRpc: () => ({ getContext: () => context }),
        } as unknown as ArgumentsHost;

        filter = new KafkaDeadLetterFilter({
            error: jest.fn(),
        } as unknown as PinoLogger);
    });

    describe("Positive tests", () => {
        it("Moves an invalid message to the dead letter topic with its original position", async () => {
            await lastValueFrom(
                filter.catch(new RpcException("amount must be a string"), host),
                { defaultValue: undefined },
            );

            expect(send).toHaveBeenCalledWith({
                topic: `${TOPIC}.dlq`,
                messages: [
                    {
                        key: "transfer-1",
                        value: JSON.stringify({ eventId: "event-1" }),
                        headers: expect.objectContaining({
                            "x-request-id": "request-1",
                            [DEAD_LETTER_HEADERS.REASON]: "invalid",
                            [DEAD_LETTER_HEADERS.ERROR]:
                                "amount must be a string",
                            [DEAD_LETTER_HEADERS.ORIGINAL_TOPIC]: TOPIC,
                            [DEAD_LETTER_HEADERS.ORIGINAL_PARTITION]: "2",
                            [DEAD_LETTER_HEADERS.ORIGINAL_OFFSET]: "42",
                        }) as unknown,
                    },
                ],
            });
        });

        it("Marks a processing error as failed", async () => {
            await lastValueFrom(
                filter.catch(new Error("Document failed validation"), host),
                { defaultValue: undefined },
            );

            expect(send).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        expect.objectContaining({
                            headers: expect.objectContaining({
                                [DEAD_LETTER_HEADERS.REASON]: "failed",
                            }) as unknown,
                        }),
                    ],
                }),
            );
        });
    });

    describe("Negative tests", () => {
        it.each([
            [
                "MongoDB is unavailable",
                new mongo.MongoNetworkError("connect ECONNREFUSED"),
            ],
            ["the service is stopping", new MongoWaitAbortedError()],
        ])("Leaves the message in Kafka when %s", async (_, error) => {
            await expect(lastValueFrom(filter.catch(error, host))).rejects.toBe(
                error,
            );

            expect(send).not.toHaveBeenCalled();
        });

        it("Rethrows when the dead letter topic is unavailable, so Kafka delivers the message again", async () => {
            const failure = new Error("dead letter topic is unavailable");
            send.mockRejectedValue(failure);

            await expect(
                lastValueFrom(filter.catch(new Error("boom"), host)),
            ).rejects.toBe(failure);
        });
    });
});
