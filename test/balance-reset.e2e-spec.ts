import { getQueueToken } from "@nestjs/bullmq";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/sequelize";
import { Queue, QueueEvents } from "bullmq";

import {
    BALANCE_RESET_DEDUP_ID,
    BALANCE_RESET_QUEUE,
    BALANCE_RESET_RUN_STATUSES,
    BalanceResetJobData,
} from "@/features/balance-reset/balance-reset.constants";
import { BalanceReset } from "@/features/balance-reset/balance-reset.model";
import { BalanceResetRunner } from "@/features/balance-reset/balance-reset.runner";
import { BalanceResetRun } from "@/features/balance-reset/balance-reset-run.model";
import { BalanceResetResponseDto } from "@/features/balance-reset/dto/balance-reset-response.dto";
import { User } from "@/features/users/user.model";
import { IUserRepository } from "@/features/users/user.repository.interface";

import { api, API_PREFIX } from "./helpers/api";
import { cleanDatabase } from "./helpers/clean-database";
import { createTestApp } from "./helpers/create-test-app";
import { registerWithId, WalletUser } from "./helpers/wallet";

const BALANCE_RESETS_URL = `${API_PREFIX}/balance-resets`;
const JOB_TIMEOUT_MS = 10_000;
// столько держим раннер, чтобы второй запрос попал в окно дедупликации
const SLOW_RUN_MS = 500;

describe("Balance reset (e2e)", () => {
    let app: INestApplication;
    let queue: Queue<BalanceResetJobData>;
    let queueEvents: QueueEvents;
    let userModel: typeof User;
    let resetModel: typeof BalanceReset;
    let runModel: typeof BalanceResetRun;
    let batchSize: number;

    beforeAll(async () => {
        app = await createTestApp();

        queue = app.get<Queue<BalanceResetJobData>>(
            getQueueToken(BALANCE_RESET_QUEUE),
        );
        userModel = app.get<typeof User>(getModelToken(User));
        resetModel = app.get<typeof BalanceReset>(getModelToken(BalanceReset));
        runModel = app.get<typeof BalanceResetRun>(
            getModelToken(BalanceResetRun),
        );

        const config = app.get(ConfigService);

        batchSize = config.getOrThrow<number>("balanceReset.batchSize");

        queueEvents = new QueueEvents(BALANCE_RESET_QUEUE, {
            connection: {
                host: config.getOrThrow<string>("redis.host"),
                port: config.getOrThrow<number>("redis.port"),
                password: config.getOrThrow<string>("redis.password"),
            },
        });
        await queueEvents.waitUntilReady();

        await app.listen(0);
    });

    beforeEach(async () => {
        jest.spyOn(console, "log").mockImplementation(() => {});

        await queue.obliterate({ force: true });
        await queue.removeDeduplicationKey(BALANCE_RESET_DEDUP_ID);
        await cleanDatabase(app);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await queueEvents.close();
        await app?.close();
    });

    const requestReset = (accessToken: string) =>
        api(app)
            .post(BALANCE_RESETS_URL)
            .set("Authorization", `Bearer ${accessToken}`);

    const registerUserWithBalance = async (
        login: string,
        balance: string,
    ): Promise<WalletUser> => {
        const user = await registerWithId(app, {
            login,
            email: `${login}@example.com`,
        });

        await userModel.update({ balance }, { where: { id: user.userId } });

        return user;
    };

    const waitForJob = async (jobId: string): Promise<void> => {
        const job = await queue.getJob(jobId);

        if (!job) {
            throw new Error(`job ${jobId} is gone from the queue`);
        }

        await job.waitUntilFinished(queueEvents, JOB_TIMEOUT_MS);
    };

    const resetAndWait = async (accessToken: string): Promise<string> => {
        const response = await requestReset(accessToken).expect(202);
        const body = response.body as BalanceResetResponseDto;

        await waitForJob(body.jobId);

        if (!body.runId) {
            throw new Error("balance reset was deduplicated unexpectedly");
        }

        return body.runId;
    };

    describe("POST /balance-resets - negative tests", () => {
        it("Returns 401 without access token", async () => {
            await api(app).post(BALANCE_RESETS_URL).expect(401);
        });

        it("Returns 401 with invalid access token", async () => {
            await requestReset("not-a-real-token").expect(401);
        });
    });

    describe("POST /balance-resets - positive tests", () => {
        it("Returns 202 with the runId of the queued run", async () => {
            const { accessToken } = await registerWithId(app);

            const response = await requestReset(accessToken).expect(202);
            const body = response.body as Record<string, unknown>;

            expect(Object.keys(body).sort()).toEqual([
                "deduplicated",
                "jobId",
                "runId",
            ]);
            expect(body.deduplicated).toBe(false);
            expect(typeof body.runId).toBe("string");

            // ждем, пока джоба выполнится, иначе тест закончится
            // и она может выполниться уже на очищенной бд
            await waitForJob(body.jobId as string);
        });

        it("Zeroes every funded balance and records the previous amount", async () => {
            const rich = await registerUserWithBalance("rich_user", "100.50");
            const poor = await registerUserWithBalance("poor_user", "0.50");

            await resetAndWait(rich.accessToken);

            const balances = await userModel.findAll();
            const resets = await resetModel.findAll();
            const byUser = Object.fromEntries(
                resets.map((row) => [row.userId, row.amount]),
            );

            expect(balances.every((user) => user.balance === "0.00")).toBe(
                true,
            );
            expect(byUser).toEqual({
                [rich.userId]: "100.50",
                [poor.userId]: "0.50",
            });
        });

        it("Closes the run with the totals", async () => {
            const first = await registerUserWithBalance("first_rich", "100.50");
            await registerUserWithBalance("second_rich", "10.25");

            const runId = await resetAndWait(first.accessToken);

            const runs = await runModel.findAll({ where: { runId } });

            expect(runs).toHaveLength(1);
            expect(runs[0].status).toBe(BALANCE_RESET_RUN_STATUSES.COMPLETED);
            expect(runs[0].attempt).toBe(1);
            expect(runs[0].processedUsers).toBe(2);
            expect(runs[0].totalWrittenOff).toBe("110.75");
            expect(runs[0].finishedAt).toBeInstanceOf(Date);
        });

        it("Skips soft-deleted users and users without money", async () => {
            const funded = await registerUserWithBalance(
                "funded_user",
                "42.00",
            );
            await registerUserWithBalance("empty_user", "0.00");
            const deleted = await registerUserWithBalance(
                "deleted_user",
                "77.00",
            );

            await userModel.destroy({ where: { id: deleted.userId } });

            await resetAndWait(funded.accessToken);

            const resets = await resetModel.findAll();
            const deletedUser = await userModel.findByPk(deleted.userId, {
                paranoid: false,
            });

            expect(resets).toHaveLength(1);
            expect(resets[0].userId).toBe(funded.userId);
            // баланс удалённого аккаунта не обнулен
            expect(deletedUser?.balance).toBe("77.00");
        });

        it("Walks the whole table in batches", async () => {
            const users: WalletUser[] = [];

            for (let i = 0; i < batchSize * 2 + 1; i++) {
                users.push(
                    await registerUserWithBalance(`batched_user_${i}`, "10.00"),
                );
            }

            const findBatch = jest.spyOn(
                app.get(IUserRepository),
                "findUserBatchForUpdate",
            );

            const runId = await resetAndWait(users[0].accessToken);

            const runs = await runModel.findAll({ where: { runId } });
            const balances = await userModel.findAll();

            // 2 + 2 + 1: последний батч неполный
            expect(findBatch).toHaveBeenCalledTimes(3);
            expect(runs[0].processedUsers).toBe(users.length);
            expect(runs[0].totalWrittenOff).toBe("50.00");
            expect(balances.every((user) => user.balance === "0.00")).toBe(
                true,
            );
        });

        it("Drops a second request while a run is in progress", async () => {
            const funded = await registerUserWithBalance(
                "funded_user",
                "42.00",
            );

            // реальный прогон очень быстрый, поэтому тормозим раннер:
            // иначе первый успеет снять ключ до второго запроса
            const run = jest
                .spyOn(app.get(BalanceResetRunner), "run")
                .mockImplementation(
                    () =>
                        new Promise((resolve) =>
                            setTimeout(resolve, SLOW_RUN_MS),
                        ),
                );

            const first = await requestReset(funded.accessToken).expect(202);
            const second = await requestReset(funded.accessToken).expect(202);

            const firstBody = first.body as BalanceResetResponseDto;
            const secondBody = second.body as BalanceResetResponseDto;

            // ключ ставится в момент add, поэтому второй запрос получает
            // id и runId удержанной джобы
            expect(secondBody.deduplicated).toBe(true);
            expect(secondBody.runId).toBe(firstBody.runId);
            expect(secondBody.jobId).toBe(firstBody.jobId);

            await waitForJob(firstBody.jobId);

            expect(run).toHaveBeenCalledTimes(1);
        });
    });
});
