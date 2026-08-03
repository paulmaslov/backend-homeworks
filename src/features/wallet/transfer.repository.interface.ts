import { Transaction } from "sequelize";

import { Transfer } from "@/features/wallet/transfer.model";

export interface CreateTransferData {
    readonly fromUserId: string | null;
    readonly toUserId: string;
    readonly amount: string;
}

export abstract class ITransferRepository {
    abstract create(
        data: CreateTransferData,
        transaction: Transaction,
    ): Promise<Transfer>;

    abstract findById(id: string): Promise<Transfer | null>;
}
