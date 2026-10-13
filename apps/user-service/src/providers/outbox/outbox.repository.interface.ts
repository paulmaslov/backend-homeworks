import { Transaction } from "sequelize";

export interface AddOutboxEventData {
    readonly id: string;
    readonly topic: string;
    readonly key: string;
    readonly payload: object;
    readonly headers: Record<string, string>;
}
export interface ClaimOutboxEventsParams {
    // сколько событий взять за раз
    readonly limit: number;
    // на сколько арендовать: пока аренда не истекла, другой relay их не возьмет
    readonly leaseMs: number;
}

export interface ClaimedOutboxEvent {
    readonly id: string;
    readonly topic: string;
    readonly key: string;
    readonly payload: object;
    readonly headers: Record<string, string>;
}

export abstract class IOutboxRepository {
    // транзакция обязательна, тк событие коммитится вместе с операцией,
    // которую оно описывает
    abstract add(
        data: AddOutboxEventData,
        transaction: Transaction,
    ): Promise<void>;

    abstract claim(
        params: ClaimOutboxEventsParams,
    ): Promise<ClaimedOutboxEvent[]>;

    abstract deletePublished(ids: string[]): Promise<void>;

    abstract release(ids: string[]): Promise<void>;
}
