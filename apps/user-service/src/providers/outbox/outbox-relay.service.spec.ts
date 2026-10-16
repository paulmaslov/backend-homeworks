import { ConfigService } from "@nestjs/config";
import type { ClientKafkaProxy } from "@nestjs/microservices";
import {
    KafkaJSConnectionError,
    KafkaJSNumberOfRetriesExceeded,
    KafkaJSProtocolError,
} from "kafkajs";
import { of, throwError } from "rxjs";

import { createLoggerMock } from "@user-service/common/testing/create-logger-mock";
import {
    ClaimedOutboxEvent,
    IOutboxRepository,
} from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxSignal } from "@user-service/providers/outbox/outbox.signal";
import { OutboxRelayService } from "@user-service/providers/outbox/outbox-relay.service";

const CONFIG: Record<string, unknown> = {
    "outbox.relayEnabled": true,
    "outbox.pollIntervalMs": 500,
    "outbox.batchSize": 100,
};

const makeEvent = (
    id: string,
    topic: string,
    attempts = 0,
): ClaimedOutboxEvent => ({
    id,
    topic,
    key: id,
    payload: { eventId: id },
    headers: {},
    attempts,
});

// иммитируем отказ кафки
const brokerRejection = (): Error =>
    new KafkaJSNumberOfRetriesExceeded(
        new KafkaJSProtocolError(
            "This server does not host this topic-partition",
        ),
        { retryCount: 2, retryTime: 300 },
    );

// иммитируем, что кафка не ответила
const brokerUnavailable = (): Error =>
    new KafkaJSNumberOfRetriesExceeded(
        new KafkaJSConnectionError("Connection error: connect ECONNREFUSED"),
        { retryCount: 2, retryTime: 300 },
    );

describe("OutboxRelayService", () => {
    let relay: OutboxRelayService;
    let repository: jest.Mocked<IOutboxRepository>;
    let emit: jest.Mock;
    let failingTopics: Map<string, Error>;

    beforeEach(() => {
        failingTopics = new Map();

        repository = {
            add: jest.fn(),
            claim: jest.fn(),
            deletePublished: jest.fn(),
            release: jest.fn(),
            scheduleRetry: jest.fn(),
            markFailed: jest.fn(),
            getStats: jest.fn(),
        };

        emit = jest.fn((topic: string) => {
            const error = failingTopics.get(topic);
            return error ? throwError(() => error) : of(undefined);
        });

        const config = {
            getOrThrow: jest.fn((key: string) => CONFIG[key]),
        } as unknown as ConfigService;

        relay = new OutboxRelayService(
            repository,
            new OutboxSignal(),
            { emit } as unknown as ClientKafkaProxy,
            config,
            createLoggerMock(),
        );

        // не запускаем цикл сбора, вызываем итерацию напрямую.
        // без этого флага отправки не будет
        relay["running"] = true;
    });

    describe("Positive tests", () => {
        it("Publishes events and removes them from the outbox", async () => {
            repository.claim.mockResolvedValue([
                makeEvent("a", "wallet.transfer.completed"),
                makeEvent("b", "wallet.transfer.completed"),
            ]);

            await expect(relay["publishBatch"]()).resolves.toBe(2);

            expect(repository.deletePublished).toHaveBeenCalledWith(["a", "b"]);
            expect(repository.release).toHaveBeenCalledWith([]);
            expect(repository.scheduleRetry).not.toHaveBeenCalled();
        });
    });

    describe("Negative tests", () => {
        it("Retries an event rejected by the broker later and publishes the rest", async () => {
            failingTopics.set("missing-topic", brokerRejection());
            repository.claim.mockResolvedValue([
                makeEvent("a", "missing-topic"),
                makeEvent("b", "wallet.transfer.completed"),
            ]);

            await relay["publishBatch"]();

            expect(repository.scheduleRetry).toHaveBeenCalledWith({
                id: "a",
                attempts: 1,
                lastError: "This server does not host this topic-partition",
                retryInMs: 1_000,
            });
            expect(repository.deletePublished).toHaveBeenCalledWith(["b"]);
            expect(repository.release).toHaveBeenCalledWith([]);
        });

        it.each([
            [0, 1_000],
            [3, 8_000],
            [15, 300_000],
        ])(
            "Pauses an event rejected %i times before by %i ms",
            async (attempts, retryInMs) => {
                failingTopics.set("missing-topic", brokerRejection());
                repository.claim.mockResolvedValue([
                    makeEvent("a", "missing-topic", attempts),
                ]);

                await relay["publishBatch"]();

                expect(repository.scheduleRetry).toHaveBeenCalledWith(
                    expect.objectContaining({
                        attempts: attempts + 1,
                        retryInMs,
                    }),
                );
            },
        );

        it("Sets an event aside after the last attempt", async () => {
            failingTopics.set("missing-topic", brokerRejection());
            repository.claim.mockResolvedValue([
                makeEvent("a", "missing-topic", 19),
            ]);

            await relay["publishBatch"]();

            expect(repository.markFailed).toHaveBeenCalledWith({
                id: "a",
                attempts: 20,
                lastError: "This server does not host this topic-partition",
            });
            expect(repository.scheduleRetry).not.toHaveBeenCalled();
        });

        it("Stops the batch and counts no attempts when the broker does not answer", async () => {
            failingTopics.set("wallet.transfer.completed", brokerUnavailable());
            repository.claim.mockResolvedValue([
                makeEvent("a", "wallet.transfer.completed"),
                makeEvent("b", "wallet.transfer.completed"),
            ]);

            await expect(relay["publishBatch"]()).rejects.toThrow(
                "Connection error",
            );

            // после первой же неудачи остальные события не пробуем
            expect(emit).toHaveBeenCalledTimes(1);
            expect(repository.scheduleRetry).not.toHaveBeenCalled();
            expect(repository.markFailed).not.toHaveBeenCalled();
            expect(repository.release).toHaveBeenCalledWith(["a", "b"]);
        });
    });
});
