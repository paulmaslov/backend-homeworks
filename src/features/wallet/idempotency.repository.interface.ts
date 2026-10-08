import { Transaction } from "sequelize";

import { IdempotencyKey } from "@/features/wallet/idempotency-key.model";
import { WalletEndpoint } from "@/features/wallet/wallet.constants";

export interface CreateIdempotencyKeyData {
    readonly userId: string;
    readonly endpoint: WalletEndpoint;
    readonly key: string;
    readonly requestHash: string;
}

export abstract class IIdempotencyRepository {
    abstract create(
        data: CreateIdempotencyKeyData,
        transaction: Transaction,
    ): Promise<IdempotencyKey>;

    abstract attachTransfer(
        id: string,
        transferId: string,
        transaction: Transaction,
    ): Promise<void>;

    // читается уже после отката транзакции, поэтому без transaction
    abstract findByScope(
        userId: string,
        endpoint: WalletEndpoint,
        key: string,
    ): Promise<IdempotencyKey | null>;

    // удаляет пачку истекших ключей, возвращает сколько удалил
    abstract deleteExpired(cutoff: Date, limit: number): Promise<number>;
}
