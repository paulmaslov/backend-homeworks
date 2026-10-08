import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import type { MigrationContext } from "@/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.createTable(
        "avatars",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
            },
            fileName: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            mimeType: { type: DataTypes.STRING(100), allowNull: false },
            size: { type: DataTypes.INTEGER, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
            updatedAt: { type: DataTypes.DATE, allowNull: false },
            deletedAt: { type: DataTypes.DATE, allowNull: true },
        },
        { transaction },
    );

    await queryInterface.addIndex("avatars", {
        name: "avatars_user_id_active",
        fields: ["userId"],
        where: { deletedAt: null },
        transaction,
    });
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.dropTable("avatars", { transaction });
};
