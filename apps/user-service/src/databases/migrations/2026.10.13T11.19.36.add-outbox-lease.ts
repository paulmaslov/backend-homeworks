import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import { MigrationContext } from "@user-service/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    // до какого момента событие арендовано relay, который его отправляет.
    // null или время в прошлом - событие свободно, его может взять любой relay
    await queryInterface.addColumn(
        "outbox_events",
        "leasedUntil",
        { type: DataTypes.DATE, allowNull: true },
        { transaction },
    );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.removeColumn("outbox_events", "leasedUntil", {
        transaction,
    });
};
