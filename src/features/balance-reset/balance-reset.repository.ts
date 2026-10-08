import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { literal, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { BALANCE_RESET_RUN_STATUSES } from "@/features/balance-reset/balance-reset.constants";
import { BalanceReset } from "@/features/balance-reset/balance-reset.model";
import {
    CreateBalanceResetData,
    IBalanceResetRepository,
} from "@/features/balance-reset/balance-reset.repository.interface";
import { BalanceResetRun } from "@/features/balance-reset/balance-reset-run.model";

// не наследуем BaseRespository тк он рассчитан на одну модель, а тут их две,
// таблицы всегда используются вместе, разделять их ради использования
// базового репозитория нет смысла
@Injectable()
export class BalanceResetRepository implements IBalanceResetRepository {
    constructor(
        @InjectModel(BalanceReset)
        private readonly resetModel: typeof BalanceReset,
        @InjectModel(BalanceResetRun)
        private readonly runModel: typeof BalanceResetRun,
        @InjectConnection() private readonly sequelize: Sequelize,
    ) {}

    async startRun(runId: string, attempt: number): Promise<BalanceResetRun> {
        return this.runModel.create({
            runId,
            attempt,
            status: BALANCE_RESET_RUN_STATUSES.RUNNING,
            startedAt: new Date(),
        });
    }

    async completeRun(id: string, processedUsers: number): Promise<string> {
        const [, rows] = await this.runModel.update(
            {
                status: BALANCE_RESET_RUN_STATUSES.COMPLETED,
                finishedAt: new Date(),
                processedUsers,
                totalWrittenOff: literal(this.sumWrittenOff(id)),
            },
            { where: { id }, returning: true },
        );

        return rows[0].totalWrittenOff;
    }

    async failRun(
        id: string,
        processedUsers: number,
        error: string,
    ): Promise<void> {
        await this.runModel.update(
            {
                status: BALANCE_RESET_RUN_STATUSES.FAILED,
                finishedAt: new Date(),
                processedUsers,
                totalWrittenOff: literal(this.sumWrittenOff(id)),
                error,
            },
            { where: { id } },
        );
    }

    // вставляем строки обнуленных балансов пользователей в журнал аудита
    async saveResets(
        resetRunId: string,
        rows: CreateBalanceResetData[],
        transaction: Transaction,
    ): Promise<void> {
        await this.resetModel.bulkCreate(
            rows.map((row) => ({ ...row, resetRunId })),
            { transaction },
        );
    }

    // считаем сумму всех списанных денег
    private sumWrittenOff(runId: string): string {
        // если не было строк для обнуления заменяем null на 0
        return `(SELECT COALESCE(SUM(amount), 0)
                 FROM balance_resets
                 WHERE "resetRunId" = ${this.sequelize.escape(runId)})`;
    }
}
