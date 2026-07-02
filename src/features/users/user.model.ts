import { Column, DataType, DeletedAt, Table } from "sequelize-typescript";
import { BaseModel } from "@/common/models/base.model";

interface UserCreationAttrs {
    login: string;
    email: string;
    password: string;
    age: number;
    description?: string;
}

@Table({
    tableName: "users",
    timestamps: true,
    paranoid: true,
    indexes: [
        { unique: true, fields: ["login"], where: { deletedAt: null } },
        { unique: true, fields: ["email"], where: { deletedAt: null } },
    ],
})
export class User extends BaseModel<User, UserCreationAttrs> {
    @Column({ type: DataType.STRING(50), allowNull: false })
    declare login: string;

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare email: string;

    // argon2 хэш
    @Column({ type: DataType.STRING(255), allowNull: false })
    declare password: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    declare age: number;

    @Column({ type: DataType.STRING(1000), allowNull: true })
    declare description: string | null;

    @DeletedAt
    declare deletedAt: Date | null;
}
