import { Transaction } from "sequelize";

export interface AddOutboxEventData {
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
}
