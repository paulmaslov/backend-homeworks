import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, Transaction } from "sequelize";

import { BaseRepository } from "@/common/repositories/base.repository";
import {
    CreateIdempotencyKeyData,
    IIdempotencyRepository,
} from "@/features/wallet/idempotency.repository.interface";
import { IdempotencyKey } from "@/features/wallet/idempotency-key.model";
import { WalletEndpoint } from "@/features/wallet/wallet.constants";

@Injectable()
export class IdempotencyRepository
    extends BaseRepository<IdempotencyKey>
    implements IIdempotencyRepository
{
    constructor(@InjectModel(IdempotencyKey) model: typeof IdempotencyKey) {
        super(model);
    }

    async create(
        data: CreateIdempotencyKeyData,
        transaction: Transaction,
    ): Promise<IdempotencyKey> {
        return this.model.create(data, { transaction });
    }

    async attachTransfer(
        id: string,
        transferId: string,
        transaction: Transaction,
    ): Promise<void> {
        await this.model.update({ transferId }, { where: { id }, transaction });
    }

    async findByScope(
        userId: string,
        endpoint: WalletEndpoint,
        key: string,
    ): Promise<IdempotencyKey | null> {
        return this.model.findOne({ where: { userId, endpoint, key } });
    }

    async deleteExpired(cutoff: Date, limit: number): Promise<number> {
        return this.model.destroy({
            where: { createdAt: { [Op.lt]: cutoff } },
            limit,
        });
    }
}
