import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import { MigrationContext } from "@user-service/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.createTable(
        "outbox_events",
        {
            // он же eventId внутри события
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            topic: { type: DataTypes.STRING(255), allowNull: false },
            // ключ партиции
            key: { type: DataTypes.STRING(255), allowNull: false },
            payload: { type: DataTypes.JSONB, allowNull: false },
            headers: { type: DataTypes.JSONB, allowNull: false },
            createdAt: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
    );

    // relay забирает самые старые события первыми
    await queryInterface.addIndex("outbox_events", {
        name: "outbox_events_created",
        fields: ["createdAt", "id"],
        transaction,
    });
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.dropTable("outbox_events", { transaction });
};
