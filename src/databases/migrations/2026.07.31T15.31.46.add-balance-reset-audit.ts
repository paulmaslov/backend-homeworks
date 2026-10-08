import { DataTypes } from "sequelize";
import type { MigrationFn } from "umzug";

import { MigrationContext } from "@/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    const { sequelize } = queryInterface;

    // журнал записей попыток обнулений баланса
    // у попыток одного запроса общий runId, но разные id
    await queryInterface.createTable(
        "balance_reset_runs",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            // идентификатор запроса из job.data
            runId: { type: DataTypes.UUID, allowNull: false },
            attempt: { type: DataTypes.SMALLINT, allowNull: false },
            status: { type: DataTypes.STRING(16), allowNull: false },
            startedAt: { type: DataTypes.DATE, allowNull: false },
            // заполняется и при успехе, и при падении
            finishedAt: { type: DataTypes.DATE, allowNull: true },
            processedUsers: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            totalWrittenOff: {
                type: DataTypes.DECIMAL(19, 2),
                allowNull: false,
                defaultValue: "0",
            },
            error: { type: DataTypes.TEXT, allowNull: true },
        },
        { transaction },
    );

    await sequelize.query(
        `ALTER TABLE balance_reset_runs
                  ADD CONSTRAINT balance_reset_runs_status_valid
                  CHECK ( status IN ('running', 'completed', 'failed') )`,
        { transaction },
    );

    // чтобы собрать все попытки одного запроса вместе
    await queryInterface.addIndex("balance_reset_runs", {
        name: "balance_reset_runs_run_id",
        fields: ["runId"],
        transaction,
    });

    // построчный аудит - у кого и сколько списали
    await queryInterface.createTable(
        "balance_resets",
        {
            id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
            // ссылка на попытку, а не на runId: при ретрае видно,
            // какая именно попытка какие строки записала
            resetRunId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "balance_reset_runs", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },
            // запрещаем жесткое удаление пользователя
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: { model: "users", key: "id" },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },
            amount: { type: DataTypes.DECIMAL(19, 2), allowNull: false },
            // updatedAt нет - строки аудита неизменяемы
            createdAt: { type: DataTypes.DATE, allowNull: false },
        },
        { transaction },
    );

    // фиксируем правило обнуления баланса только у пользователей, у которых он > 0
    await sequelize.query(
        `ALTER TABLE balance_resets
                  ADD CONSTRAINT balance_resets_amount_positive CHECK ( amount > 0 )`,
        { transaction },
    );

    await queryInterface.addIndex("balance_resets", {
        name: "balance_resets_reset_run",
        fields: ["resetRunId"],
        transaction,
    });

    await queryInterface.addIndex("balance_resets", {
        name: "balance_resets_user_created",
        fields: ["userId", { name: "createdAt", order: "DESC" }],
        transaction,
    });

    // без него каждый батч сканирует всю таблицу ради немногочисленных
    // пользователей с ненулевым балансом
    // индекс самоочищается, так как после прогона у обработанных строк баланс 0
    await sequelize.query(
        `CREATE INDEX users_funded_active
             ON users (id)
             WHERE "deletedAt" IS NULL AND balance > 0`,
        { transaction },
    );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    await queryInterface.dropTable("balance_resets", { transaction });
    await queryInterface.dropTable("balance_reset_runs", { transaction });

    // удаление индекса лочит users до коммита, поэтому делаем это последним
    await queryInterface.removeIndex("users", "users_funded_active", {
        transaction,
    });
};
