import { ConfigService } from "@nestjs/config";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { createLoggerMock } from "@/common/testing/create-logger-mock";
import { IBalanceResetRepository } from "@/features/balance-reset/balance-reset.repository.interface";
import { BalanceResetRunner } from "@/features/balance-reset/balance-reset.runner";
import { BalanceResetRun } from "@/features/balance-reset/balance-reset-run.model";
import { IUserRepository } from "@/features/users/user.repository.interface";

const BATCH_SIZE = 2;

const makeRow = (id: string, balance: string) => ({ id, balance });

describe("BalanceResetRunner", () => {
    let runner: BalanceResetRunner;
    let userRepository: jest.Mocked<IUserRepository>;
    let balanceResetRepository: jest.Mocked<IBalanceResetRepository>;

    const run = { id: "run-1" } as BalanceResetRun;

    beforeEach(() => {
        userRepository = {
            findUserBatchForUpdate: jest.fn(),
            resetBalances: jest.fn(),
        } as unknown as jest.Mocked<IUserRepository>;

        balanceResetRepository = {
            startRun: jest.fn().mockResolvedValue(run),
            completeRun: jest.fn().mockResolvedValue("0.00"),
            failRun: jest.fn(),
            saveResets: jest.fn(),
        };

        const sequelize = {
            transaction: jest.fn((cb: (t: Transaction) => Promise<unknown>) =>
                cb({} as Transaction),
            ),
        } as unknown as Sequelize;

        // читается в конструкторе, поэтому готовим до создания раннера
        const config = {
            getOrThrow: jest.fn(() => BATCH_SIZE),
        } as unknown as ConfigService;

        runner = new BalanceResetRunner(
            userRepository,
            balanceResetRepository,
            sequelize,
            config,
            createLoggerMock(),
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Negative tests", () => {
        it("Marks the run as failed and rethrows the error", async () => {
            const failure = new Error("connection lost");

            userRepository.findUserBatchForUpdate
                .mockResolvedValueOnce([
                    makeRow("a", "10.00"),
                    makeRow("b", "20.00"),
                ])
                .mockRejectedValueOnce(failure);

            // без проброса ошибки bullmq считает попытку успешной и не ретраит
            await expect(runner.run("request-1", 1)).rejects.toThrow(failure);

            expect(balanceResetRepository.failRun).toHaveBeenCalledWith(
                "run-1",
                2,
                "connection lost",
            );
            expect(balanceResetRepository.completeRun).not.toHaveBeenCalled();
        });
    });

    describe("Positive tests", () => {
        it("Completes the run without touching balances when there is nothing to reset", async () => {
            userRepository.findUserBatchForUpdate.mockResolvedValue([]);

            await runner.run("request-1", 1);

            expect(userRepository.resetBalances).not.toHaveBeenCalled();
            expect(balanceResetRepository.saveResets).not.toHaveBeenCalled();
            expect(balanceResetRepository.completeRun).toHaveBeenCalledWith(
                "run-1",
                0,
            );
        });

        it("Moves the cursor by the last row of the batch and stops on an empty batch", async () => {
            userRepository.findUserBatchForUpdate
                .mockResolvedValueOnce([
                    makeRow("a", "10.00"),
                    makeRow("b", "20.00"),
                ])
                .mockResolvedValueOnce([makeRow("c", "5.00")]);

            await runner.run("request-1", 1);

            const cursors =
                userRepository.findUserBatchForUpdate.mock.calls.map(
                    (call) => call[0],
                );

            // второй батч неполный, поэтому третьего запроса нет
            expect(cursors).toEqual([null, "b"]);
            expect(balanceResetRepository.completeRun).toHaveBeenCalledWith(
                "run-1",
                3,
            );
        });

        it("Writes the balance the user had before the reset", async () => {
            userRepository.findUserBatchForUpdate
                .mockResolvedValueOnce([
                    makeRow("a", "10.00"),
                    makeRow("b", "20.00"),
                ])
                .mockResolvedValueOnce([]);

            await runner.run("request-1", 1);

            expect(userRepository.resetBalances).toHaveBeenCalledWith(
                ["a", "b"],
                expect.anything(),
            );
            expect(balanceResetRepository.saveResets).toHaveBeenCalledWith(
                "run-1",
                [
                    { userId: "a", amount: "10.00" },
                    { userId: "b", amount: "20.00" },
                ],
                expect.anything(),
            );
        });
    });
});
