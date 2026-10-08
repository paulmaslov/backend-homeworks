import { Column, CreatedAt, DataType, Table } from "sequelize-typescript";

import { BaseModel } from "@/common/models/base.model";

interface TransferCreationAttrs {
    fromUserId: string | null;
    toUserId: string;
    amount: string;
}

// журнал операций по кошелькам
// не double-entry ledger
@Table({ tableName: "transfers", timestamps: true })
export class Transfer extends BaseModel<Transfer, TransferCreationAttrs> {
    // null если это пополнение
    @Column({ type: DataType.UUID, allowNull: true })
    declare fromUserId: string | null;

    @Column({ type: DataType.UUID, allowNull: false })
    declare toUserId: string;

    @Column({ type: DataType.DECIMAL(19, 2), allowNull: false })
    declare amount: string;

    @CreatedAt
    declare createdAt: Date;
}
