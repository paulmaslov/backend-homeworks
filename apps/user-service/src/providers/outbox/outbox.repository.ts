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
    OutboxStats,
    RecordOutboxFailureParams,
    ScheduleOutboxRetryParams,
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
            WHERE "failedAt" IS NULL
                AND ("leasedUntil" IS NULL OR "leasedUntil" < now())
            ORDER BY "createdAt", id
            LIMIT $1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING id, topic, key, payload, headers, attempts, "createdAt"
    )
    SELECT id, topic, key, payload, headers, attempts
    FROM leased
    ORDER BY "createdAt", id
`;

const STATS_SQL = `
    SELECT
        (
            SELECT count(*)
            FROM (
                     SELECT 1 FROM outbox_events WHERE "failedAt" IS NULL LIMIT $1
                 ) AS capped
        )::int AS pending,
        COALESCE(
            EXTRACT(EPOCH FROM now() - (
                SELECT min("createdAt") FROM outbox_events WHERE "failedAt" IS NULL
            )),
            0
        )::float8 AS "oldestAgeSeconds",
            (SELECT count(*) FROM outbox_events WHERE "failedAt" IS NOT NULL)::int
            AS failed
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

    // между ретраями тоже арендуем строки, чтобы relay их не взял
    async scheduleRetry({
        id,
        attempts,
        lastError,
        retryInMs,
    }: ScheduleOutboxRetryParams): Promise<void> {
        await this.model.update(
            {
                attempts,
                lastError,
                leasedUntil: new Date(Date.now() + retryInMs),
            },
            { where: { id } },
        );
    }

    async markFailed({
        id,
        attempts,
        lastError,
    }: RecordOutboxFailureParams): Promise<void> {
        await this.model.update(
            { attempts, lastError, failedAt: new Date(), leasedUntil: null },
            { where: { id } },
        );
    }

    async getStats(maxPendingToCount: number): Promise<OutboxStats> {
        const [stats] = await this.sequelize.query<OutboxStats>(STATS_SQL, {
            bind: [maxPendingToCount],
            type: QueryTypes.SELECT,
        });

        return stats;
    }
}
