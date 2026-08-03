import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";

import { BaseRepository } from "@/common/repositories/base.repository";
import { Avatar } from "@/features/avatars/avatar.model";
import {
    CreateAvatarData,
    IAvatarRepository,
} from "@/features/avatars/avatar.repository.interface";

@Injectable()
export class AvatarRepository
    extends BaseRepository<Avatar>
    implements IAvatarRepository
{
    constructor(@InjectModel(Avatar) model: typeof Avatar) {
        super(model);
    }

    async create(
        data: CreateAvatarData,
        transaction?: Transaction,
    ): Promise<Avatar> {
        return this.model.create(data, this.withTx({}, transaction));
    }

    async countActiveByUserId(
        userId: string,
        transaction?: Transaction,
    ): Promise<number> {
        // paranoid сам добавляет фильтр по deletedAt is null,
        // удаленные аватарки не идут в счет
        return this.model.count(
            this.withTx({ where: { userId } }, transaction),
        );
    }

    async softDeleteOwned(
        id: string,
        userId: string,
        transaction?: Transaction,
    ): Promise<number> {
        return this.model.destroy(
            this.withTx({ where: { id, userId } }, transaction),
        );
    }
}
