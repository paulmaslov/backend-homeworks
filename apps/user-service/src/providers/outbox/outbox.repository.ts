import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { QueryTypes, Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { BaseRepository } from "@user-service/common/repositories/base.repository";
import {
    AddOutboxEventData,
    ClaimedOutboxEvent,
    ClaimOutboxEventsParams,
    IOutboxRepository,
} from "@user-service/providers/outbox/outbox.repository.interface";
import { OutboxSignal } from "@user-service/providers/outbox/outbox.signal";
import { OutboxEvent } from "@user-service/providers/outbox/outbox-event.model";

const CLAIM_SQL = `
    WITH leased AS (
        UPDATE outbox_events
        SET "leasedUntil" = now() + $2 * interval '1 millisecond'
        WHERE id IN (
            SELECT id
            FROM outbox_events
            WHERE "leasedUntil" IS NULL OR "leasedUntil" < now()
            ORDER BY "createdAt", id
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, topic, key, payload, headers, "createdAt"
    )
    SELECT id, topic, key, payload, headers
    FROM leased
    ORDER BY "createdAt", id
`;

@Injectable()
export class OutboxRepository
    extends BaseRepository<OutboxEvent>
    implements IOutboxRepository
{
    constructor(
        @InjectModel(OutboxEvent) model: typeof OutboxEvent,
        @InjectConnection() private readonly sequelize: Sequelize,
        private readonly signal: OutboxSignal,
    ) {
        super(model);
    }

    async add(
        data: AddOutboxEventData,
        transaction: Transaction,
    ): Promise<void> {
        await this.model.create(data, { transaction });

        transaction.afterCommit(() => this.signal.notify());
    }

    async claim({
        limit,
        leaseMs,
    }: ClaimOutboxEventsParams): Promise<ClaimedOutboxEvent[]> {
        return this.sequelize.query<ClaimedOutboxEvent>(CLAIM_SQL, {
            bind: [limit, leaseMs],
            type: QueryTypes.SELECT,
        });
    }

    async deletePublished(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }

        await this.model.destroy({ where: { id: ids } });
    }

    async release(ids: string[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }

        await this.model.update({ leasedUntil: null }, { where: { id: ids } });
    }
}
