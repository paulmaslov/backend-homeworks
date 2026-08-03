import { Column, DataType, Table } from "sequelize-typescript";

import { BaseModel } from "@/common/models/base.model";

interface IdempotencyKeyCreationAttrs {
    userId: string;
    endpoint: string;
    key: string;
    requestHash: string;
}

@Table({ tableName: "idempotency_keys", timestamps: true })
export class IdempotencyKey extends BaseModel<
    IdempotencyKey,
    IdempotencyKeyCreationAttrs
> {
    @Column({ type: DataType.UUID, allowNull: false })
    declare userId: string;

    @Column({ type: DataType.STRING(32), allowNull: false })
    declare endpoint: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare key: string;

    // sha256 от параметров запроса
    @Column({ type: DataType.CHAR(64), allowNull: false })
    declare requestHash: string;

    // проставляется в той же транзакции, что и сама операция
    @Column({ type: DataType.UUID, allowNull: true })
    declare transferId: string | null;
}
