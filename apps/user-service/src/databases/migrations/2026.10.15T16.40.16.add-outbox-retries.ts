import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import { MigrationContext } from "@user-service/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    // сколько раз брокер отказался принять событие
    await queryInterface.addColumn(
        "outbox_events",
        "attempts",
        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction },
    );

    // текст последнего отказа: по нему можно понять, что не так с событием
    await queryInterface.addColumn(
        "outbox_events",
        "lastError",
        { type: DataTypes.TEXT, allowNull: true },
        { transaction },
    );

    // когда событие отложено после всех попыток. relay такие события не берет
    await queryInterface.addColumn(
        "outbox_events",
        "failedAt",
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
    );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.removeColumn("outbox_events", "failedAt", {
        transaction,
    });
    await queryInterface.removeColumn("outbox_events", "lastError", {
        transaction,
    });
    await queryInterface.removeColumn("outbox_events", "attempts", {
        transaction,
    });
};
