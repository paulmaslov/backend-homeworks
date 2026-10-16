import { mongo } from "mongoose";
import { PinoLogger } from "nestjs-pino";

import {
    MongoRetry,
    MongoWaitAbortedError,
} from "@notification-service/providers/databases/mongodb/mongo-retry";

describe("MongoRetry", () => {
    let retry: MongoRetry;
    let heartbeat: jest.Mock;

    beforeEach(() => {
        retry = new MongoRetry({ warn: jest.fn() } as unknown as PinoLogger);
        heartbeat = jest.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
        retry.onModuleDestroy();
    });

    describe("Positive tests", () => {
        // пауза между попытками 5 с, поэтому тест идет около 5 с
        it("Waits for MongoDB to come back and keeps the Kafka consumer alive meanwhile", async () => {
            const save = jest
                .fn()
                .mockRejectedValueOnce(
                    new mongo.MongoNetworkError("connect ECONNREFUSED"),
                )
                .mockResolvedValueOnce("saved");

            await expect(retry.whileUnavailable(save, heartbeat)).resolves.toBe(
                "saved",
            );

            expect(save).toHaveBeenCalledTimes(2);
            expect(heartbeat).toHaveBeenCalled();
        }, 10_000);
    });

    describe("Negative tests", () => {
        it("Does not retry errors other than MongoDB being unavailable", async () => {
            const failure = new Error("Document failed validation");
            const save = jest.fn().mockRejectedValue(failure);

            await expect(retry.whileUnavailable(save, heartbeat)).rejects.toBe(
                failure,
            );

            expect(save).toHaveBeenCalledTimes(1);
        });

        it("Stops waiting when the service is shutting down", async () => {
            const save = jest
                .fn()
                .mockRejectedValue(
                    new mongo.MongoNetworkError("connect ECONNREFUSED"),
                );

            const waiting = retry.whileUnavailable(save, heartbeat);
            retry.onModuleDestroy();

            await expect(waiting).rejects.toBeInstanceOf(MongoWaitAbortedError);
        });
    });
});
