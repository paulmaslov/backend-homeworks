import { Column, DataType, Table } from "sequelize-typescript";

import { BaseModel } from "@/common/models/base.model";
import { BalanceResetRunStatus } from "@/features/balance-reset/balance-reset.constants";

interface BalanceResetRunCreationAttrs {
    runId: string;
    attempt: number;
    status: BalanceResetRunStatus;
    startedAt: Date;
}

// timestamps выключены, тк createdAt дублировал бы startedAt, а момент
// изменения строки фиксирует finishedAt
// фиксируем все попытки прогона обнуления балансов пользователей
@Table({ tableName: "balance_reset_runs", timestamps: false })
export class BalanceResetRun extends BaseModel<
    BalanceResetRun,
    BalanceResetRunCreationAttrs
> {
    // идентификатор запроса, общий для всех попыток одной джобы
    @Column({ type: DataType.UUID, allowNull: false })
    declare runId: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    declare attempt: number;

    @Column({ type: DataType.STRING(16), allowNull: false })
    declare status: BalanceResetRunStatus;

    @Column({ type: DataType.DATE, allowNull: false })
    declare startedAt: Date;

    @Column({ type: DataType.DATE, allowNull: true })
    declare finishedAt: Date | null;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    declare processedUsers: number;

    @Column({
        type: DataType.DECIMAL(19, 2),
        allowNull: false,
        defaultValue: "0",
    })
    declare totalWrittenOff: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare error: string | null;
}
