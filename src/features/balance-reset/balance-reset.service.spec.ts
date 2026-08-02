import { ConfigService } from "@nestjs/config";
import { Job, Queue } from "bullmq";

import { createLoggerMock } from "@/common/testing/create-logger-mock";
import {
    BALANCE_RESET_DEDUP_ID,
    BALANCE_RESET_JOBS,
    BalanceResetJobData,
} from "@/features/balance-reset/balance-reset.constants";
import { BalanceResetService } from "@/features/balance-reset/balance-reset.service";

const DEDUP_TTL_MS = 300_000;
const JOB_ID = "42";

describe("BalanceResetService", () => {
    let service: BalanceResetService;
    let queue: jest.Mocked<Queue<BalanceResetJobData>>;

    beforeEach(() => {
        queue = {
            add: jest.fn(),
            getJob: jest.fn(),
        } as unknown as jest.Mocked<Queue<BalanceResetJobData>>;

        // читается в конструкторе, поэтому готовим до создания сервиса
        const config = {
            getOrThrow: jest.fn(() => DEDUP_TTL_MS),
        } as unknown as ConfigService;

        service = new BalanceResetService(queue, config, createLoggerMock());

        queue.add.mockResolvedValue({ id: JOB_ID } as Job<BalanceResetJobData>);

        // имитируем логику редиса
        queue.getJob.mockImplementation(() => {
            const [, data] = queue.add.mock.calls[0];

            return Promise.resolve({ data } as Job<BalanceResetJobData>);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("Negative tests", () => {
        it("Throws when the queue returns a job without an id", async () => {
            queue.add.mockResolvedValue({} as Job<BalanceResetJobData>);

            await expect(service.enqueue()).rejects.toThrow(
                "balance reset job was added without an id",
            );
        });

        it("Reports the run as deduplicated when the kept job is gone from redis", async () => {
            queue.getJob.mockResolvedValue(undefined);

            const result = await service.enqueue();

            expect(result.deduplicated).toBe(true);
            expect(result.runId).toBeNull();
        });
    });

    describe("Positive tests", () => {
        it("Reports the run as deduplicated and returns the kept runId", async () => {
            queue.getJob.mockResolvedValue({
                data: { runId: "already-running" },
            } as Job<BalanceResetJobData>);

            const result = await service.enqueue();

            expect(result.deduplicated).toBe(true);
            expect(result.runId).toBe("already-running");
            expect(result.jobId).toBe(JOB_ID);
        });

        it("Adds a run job with a generated runId and the deduplication key", async () => {
            await service.enqueue();

            expect(queue.add).toHaveBeenCalledWith(
                BALANCE_RESET_JOBS.RUN,
                { runId: expect.any(String) as string },
                expect.objectContaining({
                    deduplication: {
                        id: BALANCE_RESET_DEDUP_ID,
                        ttl: DEDUP_TTL_MS,
                    },
                }),
            );
        });

        it("Returns the runId that went into the job data", async () => {
            const result = await service.enqueue();

            const [, data] = queue.add.mock.calls[0];

            expect(result.runId).toBe(data.runId);
            expect(result.deduplicated).toBe(false);
            expect(result.jobId).toBe(JOB_ID);
        });
    });
});
