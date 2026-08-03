import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

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

        @InjectPinoLogger(BalanceResetProcessor.name)
        private readonly logger: PinoLogger,
    ) {
        super();
    }

    async process(job: Job<BalanceResetJobData>): Promise<void> {
        this.logger.debug(
            { jobId: job.id, jobName: job.name, attempt: job.attemptsMade + 1 },
            "Processing job",
        );

        switch (job.name) {
            case BALANCE_RESET_JOBS.TICK:
                await this.service.enqueue();
                return;

            case BALANCE_RESET_JOBS.RUN:
                await this.runner.run(job.data.runId, job.attemptsMade + 1);

                try {
                    await job.removeDeduplicationKey();
                } catch (error) {
                    this.logger.warn(
                        { err: error, jobId: job.id, runId: job.data.runId },
                        "Failed to remove deduplication key",
                    );
                }

                return;

            default:
                this.logger.error(
                    { jobId: job.id, jobName: job.name },
                    "Unknown job name",
                );
                throw new Error(
                    `[balance-reset] unknown job name: ${job.name}`,
                );
        }
    }
}
