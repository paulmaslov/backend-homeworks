import { Column, DataType, Model } from "sequelize-typescript";

export abstract class BaseModel<
    ModelType extends object,
    CreationAttrs extends object = ModelType,
> extends Model<ModelType, CreationAttrs> {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true,
    })
    declare id: string;
}
