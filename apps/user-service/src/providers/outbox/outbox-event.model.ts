import { Column, CreatedAt, DataType, Table } from "sequelize-typescript";

import { BaseModel } from "@user-service/common/models/base.model";

// id строки должен совпадать с eventId, поэтому мы генерируем его заранее
// и передаем явно, хотя BaseModel автоматически генерирует его сам
interface OutboxEventCreationAttrs {
    id: string;
    topic: string;
    key: string;
    payload: object;
    headers: Record<string, string>;
}

@Table({ tableName: "outbox_events", timestamps: true, updatedAt: false })
export class OutboxEvent extends BaseModel<
    OutboxEvent,
    OutboxEventCreationAttrs
> {
    @Column({ type: DataType.STRING(255), allowNull: false })
    declare topic: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare key: string;

    @Column({ type: DataType.JSONB, allowNull: false })
    declare payload: object;

    @Column({ type: DataType.JSONB, allowNull: false })
    declare headers: Record<string, string>;

    // до какого момента событие арендовано relay, null - свободно
    @Column({ type: DataType.DATE, allowNull: true })
    declare leasedUntil: Date | null;

    @CreatedAt
    declare createdAt: Date;
}
