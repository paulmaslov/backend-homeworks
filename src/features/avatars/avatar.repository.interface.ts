import { Transaction } from "sequelize";

import { Avatar } from "@/features/avatars/avatar.model";

export interface CreateAvatarData {
    readonly userId: string;
    readonly fileName: string;
    readonly mimeType: string;
    readonly size: number;
}

export abstract class IAvatarRepository {
    abstract create(
        data: CreateAvatarData,
        transaction?: Transaction,
    ): Promise<Avatar>;

    abstract countActiveByUserId(
        userId: string,
        transaction?: Transaction,
    ): Promise<number>;

    abstract softDeleteOwned(
        id: string,
        userId: string,
        transaction?: Transaction,
    ): Promise<number>;
}
