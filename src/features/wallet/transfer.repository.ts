import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";

import { BaseRepository } from "@/common/repositories/base.repository";
import { Transfer } from "@/features/wallet/transfer.model";
import {
    CreateTransferData,
    ITransferRepository,
} from "@/features/wallet/transfer.repository.interface";

@Injectable()
export class TransferRepository
    extends BaseRepository<Transfer>
    implements ITransferRepository
{
    constructor(@InjectModel(Transfer) model: typeof Transfer) {
        super(model);
    }

    async create(
        data: CreateTransferData,
        transaction: Transaction,
    ): Promise<Transfer> {
        // транзакция обязательна, тк запись в историю переводов
        // логична только при успешном переводе
        return this.model.create(data, { transaction });
    }

    async findById(id: string): Promise<Transfer | null> {
        return this.model.findByPk(id);
    }
}
