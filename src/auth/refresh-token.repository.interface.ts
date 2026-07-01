import { Transaction } from "sequelize";
import { RefreshToken } from "./refresh-token.model";

export interface CreateRefreshTokenData {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
}

export abstract class IRefreshTokenRepository {
    abstract create(
        data: CreateRefreshTokenData,
        transaction?: Transaction,
    ): Promise<RefreshToken>;

    abstract findByTokenHash(
        tokenHash: string,
        transaction?: Transaction,
    ): Promise<RefreshToken | null>;

    abstract deleteByTokenHash(
        tokenHash: string,
        transaction?: Transaction,
    ): Promise<number>;

    abstract deleteByUserId(
        userId: string,
        transaction?: Transaction,
    ): Promise<number>;
}
