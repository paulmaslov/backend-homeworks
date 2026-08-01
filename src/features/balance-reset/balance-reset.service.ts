import { randomUUID } from "node:crypto";

import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";

import {
    BALANCE_RESET_DEDUP_ID,
    BALANCE_RESET_JOBS,
    BALANCE_RESET_QUEUE,
    BalanceResetJobData,
} from "@/features/balance-reset/balance-reset.constants";
import { BalanceResetResponseDto } from "@/features/balance-reset/dto/balance-reset-response.dto";

@Injectable()
export class BalanceResetService {
    private readonly dedupTtlMs: number;

    constructor(
        @InjectQueue(BALANCE_RESET_QUEUE)
        private readonly queue: Queue<BalanceResetJobData>,
        config: ConfigService,
    ) {
        this.dedupTtlMs = config.getOrThrow<number>("balanceReset.dedupTtlMs");
    }

    // и роут и шедулер пользуются этим методом для обнуления баланса
    async enqueue(): Promise<BalanceResetResponseDto> {
        const runId = randomUUID();

        const job = await this.queue.add(
            BALANCE_RESET_JOBS.RUN,
            { runId },
            {
                // ttl нужен на случай, если процесс убьют и снять ключ некому
                deduplication: {
                    id: BALANCE_RESET_DEDUP_ID,
                    ttl: this.dedupTtlMs,
                },
                // ttl отсчитывается от add, поэтому он обязан покрывать
                // прогон вместе со всеми backoff-задержками
                attempts: 3,
                backoff: { type: "exponential", delay: 1000 },
                // при очистке балансов раз в 10 минут мы можем посмотреть
                // историю джоб за последние сутки
                removeOnComplete: { count: 150 },
                removeOnFail: { count: 100 },
            },
        );

        if (!job.id) {
            throw new Error("balance reset job was added without an id");
        }

        // если в данный момент в очереди уже есть джоба обнуления - возвращаем ее
        const stored = await this.queue.getJob(job.id);

        if (!stored || stored.data.runId !== runId) {
            const keptRunId = stored?.data.runId ?? null;

            console.log(
                `[balance-reset] deduplicated: kept runId=${keptRunId ?? "unknown"}, dropped runId=${runId}`,
            );

            return new BalanceResetResponseDto(keptRunId, job.id, true);
        }

        console.log(
            `[balance-reset] enqueued: runId=${runId}, jobId=${job.id}`,
        );

        return new BalanceResetResponseDto(runId, job.id, false);
    }
}
