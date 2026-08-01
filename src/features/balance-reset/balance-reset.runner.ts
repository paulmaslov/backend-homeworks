import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";

import { IBalanceResetRepository } from "@/features/balance-reset/balance-reset.repository.interface";
import { IUserRepository } from "@/features/users/user.repository.interface";

// про bullmq не знает ничего: снятие ключа дедупликации живет
// в процессоре, поэтому раннер тестируется без очереди
@Injectable()
export class BalanceResetRunner {
    private readonly batchSize: number;

    constructor(
        private readonly userRepository: IUserRepository,
        private readonly balanceResetRepository: IBalanceResetRepository,
        @InjectConnection() private readonly sequelize: Sequelize,
        config: ConfigService,
    ) {
        this.batchSize = config.getOrThrow<number>("balanceReset.batchSize");
    }

    async run(runId: string, attempt: number): Promise<void> {
        const run = await this.balanceResetRepository.startRun(runId, attempt);
        const startedAt = Date.now();

        let afterId: string | null = null;
        let processed = 0;

        try {
            let fetched = 0;

            do {
                const batch = await this.sequelize.transaction(
                    async (transaction) => {
                        const rows =
                            await this.userRepository.findUserBatchForUpdate(
                                afterId,
                                this.batchSize,
                                transaction,
                            );

                        if (rows.length === 0) {
                            return rows;
                        }

                        await this.userRepository.resetBalances(
                            rows.map((row) => row.id),
                            transaction,
                        );

                        await this.balanceResetRepository.saveResets(
                            run.id,
                            rows.map((row) => ({
                                userId: row.id,
                                amount: row.balance,
                            })),
                            transaction,
                        );

                        return rows;
                    },
                );

                fetched = batch.length;

                if (fetched > 0) {
                    // выборка отсортирована по возрастанию id, поэтому
                    // курсор это последняя строка батча
                    afterId = batch[fetched - 1].id;
                    processed += fetched;
                }

                // неполный батч означает, что за курсором строк не осталось
            } while (fetched === this.batchSize);

            const totalWrittenOff =
                await this.balanceResetRepository.completeRun(
                    run.id,
                    processed,
                );

            console.log(
                `[balance-reset] completed: runId=${runId}, users=${processed}, total=${totalWrittenOff}, took=${Date.now() - startedAt}ms`,
            );
        } catch (error) {
            const message =
                error instanceof Error ? error.message : JSON.stringify(error);

            console.log(
                `[balance-reset] failed: runId=${runId}, users=${processed}, error=${message}`,
            );

            // если недоступна сама бд, запись статуса упадет тоже
            // и замаскирует исходную ошибку
            try {
                await this.balanceResetRepository.failRun(
                    run.id,
                    processed,
                    message,
                );
            } catch (failure) {
                console.log(
                    `[balance-reset] failed to mark run ${run.id} as failed`,
                    failure,
                );
            }

            // без throw bullmq считает попытку успешной и не ретраит
            throw error;
        }
    }
}
