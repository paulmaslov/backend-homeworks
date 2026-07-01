import {Column, DataType, Table} from "sequelize-typescript";
import {BaseModel} from "../../common/models/base.model";

@Table({ tableName: "users", timestamps: true })
export class User extends BaseModel {
    @Column({ type: DataType.STRING(50), unique: true, allowNull: false })
    declare login: string;

    @Column({ type: DataType.STRING(255), unique: true, allowNull: false })
    declare email: string;

    // argon2 хэш
    @Column({ type: DataType.STRING(255), allowNull: false })
    declare password: string;

    @Column({ type: DataType.SMALLINT, allowNull: false })
    declare age: number;

    @Column({ type: DataType.STRING(1000), allowNull: true })
    declare description: string | null
}