import { QueryInterface, Transaction } from "sequelize";

export interface MigrationContext {
    queryInterface: QueryInterface;
    transaction: Transaction;
}
