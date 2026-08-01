import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import {
    BALANCE_RESET_JOBS,
    BALANCE_RESET_QUEUE,
    BalanceResetJobData,
} from "@/features/balance-reset/balance-reset.constants";
import { BalanceResetRunner } from "@/features/balance-reset/balance-reset.runner";
import { BalanceResetService } from "@/features/balance-reset/balance-reset.service";

@Processor(BALANCE_RESET_QUEUE, { concurrency: 1 })
export class BalanceResetProcessor extends WorkerHost {
    constructor(
        private readonly service: BalanceResetService,
        private readonly runner: BalanceResetRunner,
    ) {
        super();
    }

    async process(job: Job<BalanceResetJobData>): Promise<void> {
        switch (job.name) {
            case BALANCE_RESET_JOBS.TICK:
                await this.service.enqueue();
                return;

            case BALANCE_RESET_JOBS.RUN:
                await this.runner.run(job.data.runId, job.attemptsMade + 1);

                try {
                    await job.removeDeduplicationKey();
                } catch (error) {
                    console.log(
                        `[balance-reset] failed to remove deduplication key`,
                        error,
                    );
                }

                return;

            default:
                throw new Error(
                    `[balance-reset] unknown job name: ${job.name}`,
                );
        }
    }
}
