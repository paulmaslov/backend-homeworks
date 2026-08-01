import { Transaction } from "sequelize";

import { BalanceResetRun } from "@/features/balance-reset/balance-reset-run.model";

export interface CreateBalanceResetData {
    readonly userId: string;
    // баланс до обнуления
    readonly amount: string;
}

export abstract class IBalanceResetRepository {
    abstract startRun(runId: string, attempt: number): Promise<BalanceResetRun>;

    // возвращает сумму средств на обнуленных балансах
    abstract completeRun(id: string, processedUsers: number): Promise<string>;

    abstract failRun(
        id: string,
        processedUsers: number,
        error: string,
    ): Promise<void>;

    // транзакция обязательна тк строки об обнулении баланса пользователя в
    // журнале аудита, не должно быть без реального обнуления его баланса
    abstract saveResets(
        resetRunId: string,
        rows: CreateBalanceResetData[],
        transaction: Transaction,
    ): Promise<void>;
}
