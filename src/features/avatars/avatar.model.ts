import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    Table,
} from "sequelize-typescript";

import { BaseModel } from "@/common/models/base.model";
import { User } from "@/features/users/user.model";

interface AvatarCreationAttrs {
    userId: string;
    fileName: string;
    mimeType: string;
    size: number;
}

@Table({
    tableName: "avatars",
    timestamps: true,
    paranoid: true,

    indexes: [
        {
            name: "avatars_user_id_active",
            fields: ["userId"],
            where: { deletedAt: null },
        },
    ],
})
export class Avatar extends BaseModel<Avatar, AvatarCreationAttrs> {
    @ForeignKey(() => User)
    @Column({ type: DataType.UUID, allowNull: false })
    declare userId: string;

    // имя файла без домена и папок
    @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
    declare fileName: string;

    @Column({ type: DataType.STRING(100), allowNull: false })
    declare mimeType: string;

    // размер в байтах
    @Column({ type: DataType.INTEGER, allowNull: false })
    declare size: number;

    @CreatedAt
    declare createdAt: Date;

    @DeletedAt
    declare deletedAt: Date | null;

    @BelongsTo(() => User)
    declare user: User;
}
