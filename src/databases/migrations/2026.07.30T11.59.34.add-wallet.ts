import { DataTypes, Op } from "sequelize";
import type { MigrationFn } from "umzug";

import { MigrationContext } from "@/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    const { sequelize } = queryInterface;

    await queryInterface.addColumn(
        "users",
        "balance",
        {
            type: DataTypes.DECIMAL(19, 2),
            allowNull: false,
            defaultValue: "0",
        },
        { transaction },
    );

    // уход в минус
    await sequelize.query(
        `ALTER TABLE users
                  ADD CONSTRAINT users_balance_non_negative CHECK (balance >= 0)`,
        { transaction },
    );

    // верхняя граница баланса
    await sequelize.query(
        `ALTER TABLE users
                  ADD CONSTRAINT users_balance_max CHECK ( balance <= 999999999999999.99)`,
        { transaction },
    );

    await queryInterface.createTable(
        "transfers",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            // может быть NULL если это операция пополнения
            fromUserId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
            },
            toUserId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
            },
            amount: { type: DataTypes.DECIMAL(19, 2), allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
    );

    await sequelize.query(
        `ALTER TABLE transfers
                  ADD CONSTRAINT transfers_amount_positive CHECK ( amount > 0 )`,
        { transaction },
    );

    await sequelize.query(
        `ALTER TABLE transfers
                  ADD CONSTRAINT transfers_not_self CHECK ( "fromUserId" IS DISTINCT FROM "toUserId" )`,
        { transaction },
    );

    await queryInterface.addIndex("transfers", {
        name: "transfers_to_user_created",
        fields: ["toUserId", { name: "createdAt", order: "DESC" }],
        transaction,
    });

    // пополнения в индекс не попадают - у них fromUserId null
    await queryInterface.addIndex("transfers", {
        name: "transfers_from_user_created",
        fields: ["fromUserId", { name: "createdAt", order: "DESC" }],
        where: { fromUserId: { [Op.ne]: null } },
        transaction,
    });

    await queryInterface.createTable(
        "idempotency_keys",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
            },
            endpoint: { type: DataTypes.STRING(32), allowNull: false },
            key: { type: DataTypes.STRING(255), allowNull: false },
            requestHash: { type: DataTypes.CHAR(64), allowNull: false },
            transferId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: { model: "transfers", key: "id" },
                onUpdate: "CASCADE",
            },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
    );

    // тк ключ идемпотентности приходит от клиента - они могут повторяться
    // поэтому при приходе нового ключа бд будет сравнивать не просто ключ,
    // а ключ + айди пользователя и эндпоинт
    await queryInterface.addConstraint("idempotency_keys", {
        name: "idempotency_keys_scope",
        fields: ["userId", "endpoint", "key"],
        type: "unique",
        transaction,
    });

    // для удаления старых ключей
    await queryInterface.addIndex("idempotency_keys", {
        name: "idempotency_keys_created",
        fields: ["createdAt"],
        transaction,
    });
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.dropTable("idempotency_keys", { transaction });
    await queryInterface.dropTable("transfers", { transaction });
    // констрейнты и индексы уходят вместе с колонкой
    await queryInterface.removeColumn("users", "balance", { transaction });
};
