import {
    Table,
    Column,
    DataType,
    ForeignKey,
    BelongsTo,
} from "sequelize-typescript";
import { BaseModel } from "@/common/models/base.model";
import { User } from "@/features/users/user.model";

interface RefreshTokenCreationAttrs {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
}

@Table({ tableName: "refresh_tokens", timestamps: true })
export class RefreshToken extends BaseModel<
    RefreshToken,
    RefreshTokenCreationAttrs
> {
    // SHA-256 хэш
    @Column({ type: DataType.STRING(64), allowNull: false, unique: true })
    declare tokenHash: string;

    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare userId: string;

    @Column({ type: DataType.DATE, allowNull: false })
    declare expiresAt: Date;

    @BelongsTo(() => User)
    declare user: User;
}
