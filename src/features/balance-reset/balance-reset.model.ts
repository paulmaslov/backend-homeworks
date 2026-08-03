import { Column, CreatedAt, DataType, Table } from "sequelize-typescript";

import { BaseModel } from "@/common/models/base.model";

interface BalanceResetCreationAttrs {
    resetRunId: string;
    userId: string;
    amount: string;
}

// updatedAt нет - строки аудита неизменяемы
// фиксируем, у какого пользотеля обнулили баланс в каком прогоне
@Table({ tableName: "balance_resets", timestamps: true, updatedAt: false })
export class BalanceReset extends BaseModel<
    BalanceReset,
    BalanceResetCreationAttrs
> {
    // ссылка на попытку прогона, а не на runId запроса: при ретрае
    // видно, какая именно попытка какие строки записала
    @Column({ type: DataType.UUID, allowNull: false })
    declare resetRunId: string;

    @Column({ type: DataType.UUID, allowNull: false })
    declare userId: string;

    // баланс, который был у пользователя до обнуления
    @Column({ type: DataType.DECIMAL(19, 2), allowNull: false })
    declare amount: string;

    @CreatedAt
    declare createdAt: Date;
}
