import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction } from "sequelize";

import { BaseRepository } from "@/common/repositories/base.repository";

import { RefreshToken } from "./refresh-token.model";
import {
    CreateRefreshTokenData,
    IRefreshTokenRepository,
} from "./refresh-token.repository.interface";

@Injectable()
export class RefreshTokenRepository
    extends BaseRepository<RefreshToken>
    implements IRefreshTokenRepository
{
    constructor(@InjectModel(RefreshToken) model: typeof RefreshToken) {
        super(model);
    }

    async create(
        data: CreateRefreshTokenData,
        transaction?: Transaction,
    ): Promise<RefreshToken> {
        return this.model.create(data, this.withTx({}, transaction));
    }

    async findByTokenHash(
        tokenHash: string,
        transaction?: Transaction,
    ): Promise<RefreshToken | null> {
        return this.model.findOne(
            this.withTx({ where: { tokenHash } }, transaction),
        );
    }

    async deleteByTokenHash(
        tokenHash: string,
        transaction?: Transaction,
    ): Promise<number> {
        return this.model.destroy(
            this.withTx({ where: { tokenHash } }, transaction),
        );
    }

    async deleteByUserId(
        userId: string,
        transaction?: Transaction,
    ): Promise<number> {
        return this.model.destroy(
            this.withTx({ where: { userId } }, transaction),
        );
    }
}
