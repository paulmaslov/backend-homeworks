import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

import {
    BALANCE_RESET_JOBS,
    BALANCE_RESET_QUEUE,
    BALANCE_RESET_SCHEDULER_ID,
    BalanceResetJobData,
} from "@/features/balance-reset/balance-reset.constants";

@Injectable()
export class BalanceResetScheduler implements OnApplicationBootstrap {
    private readonly scheduleEnabled: boolean;
    private readonly intervalMs: number;

    constructor(
        @InjectQueue(BALANCE_RESET_QUEUE)
        private readonly queue: Queue<BalanceResetJobData>,
        config: ConfigService,

        @InjectPinoLogger(BalanceResetScheduler.name)
        private readonly logger: PinoLogger,
    ) {
        this.scheduleEnabled = config.getOrThrow<boolean>(
            "balanceReset.scheduleEnabled",
        );
        this.intervalMs = config.getOrThrow<number>("balanceReset.intervalMs");
    }

    async onApplicationBootstrap(): Promise<void> {
        if (!this.scheduleEnabled) {
            await this.queue.removeJobScheduler(BALANCE_RESET_SCHEDULER_ID);
            this.logger.warn(
                "Balance reset scheduler is disabled, job scheduler removed",
            );
            return;
        }

        await this.queue.upsertJobScheduler(
            BALANCE_RESET_SCHEDULER_ID,
            { every: this.intervalMs },
            {
                name: BALANCE_RESET_JOBS.TICK,
                opts: {
                    // при расчете для запуска каждые 10 минут чтобы хранились
                    // все джобы за последний день
                    removeOnComplete: { count: 150 },
                    removeOnFail: { count: 150 },
                },
            },
        );

        this.logger.info(
            { intervalMs: this.intervalMs },
            "Balance reset scheduler enabled",
        );
    }
}
