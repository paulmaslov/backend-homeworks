import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import type { MigrationContext } from "@/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.createTable(
        "users",
        {
            // без defaultValue - uuid генерирует sequelize в приложении
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            login: { type: DataTypes.STRING(50), allowNull: false },
            email: { type: DataTypes.STRING(255), allowNull: false },
            password: { type: DataTypes.STRING(255), allowNull: false },
            age: { type: DataTypes.SMALLINT, allowNull: false },
            description: { type: DataTypes.STRING(1000), allowNull: true },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            deletedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
    );

    await queryInterface.addIndex("users", {
        name: "users_login",
        fields: ["login"],
        unique: true,
        where: { deletedAt: null },
        transaction,
    });

    await queryInterface.addIndex("users", {
        name: "users_email",
        fields: ["email"],
        unique: true,
        where: { deletedAt: null },
        transaction,
    });

    await queryInterface.createTable(
        "refresh_tokens",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            tokenHash: {
                type: DataTypes.STRING(64),
                allowNull: false,
                unique: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
            },
            expiresAt: { type: DataTypes.DATE, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
    );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.dropTable("refresh_tokens", { transaction });
    await queryInterface.dropTable("users", { transaction });
};
