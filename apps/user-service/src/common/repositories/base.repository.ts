import { ModelStatic, Transaction } from "sequelize";
import { Model } from "sequelize-typescript";

export abstract class BaseRepository<M extends Model> {
    protected constructor(protected readonly model: ModelStatic<M>) {}

    protected withTx<T extends object>(
        options: T,
        transaction?: Transaction,
    ): T & { transaction?: Transaction } {
        return transaction ? { ...options, transaction } : options;
    }
}
