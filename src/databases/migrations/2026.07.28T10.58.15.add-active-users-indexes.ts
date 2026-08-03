import type { MigrationFn } from "umzug";

import type { MigrationContext } from "@/databases/migration.context";

export const up: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    const { sequelize } = queryInterface;

    // индекс под выборку активных пользователей
    // age - параметр запроса, удаленные пользователи не попадают в индекс
    await sequelize.query(
        `CREATE INDEX users_age_active_with_description
             ON users (age, id)
             WHERE "deletedAt" IS NULL AND description <> ''`,
        { transaction },
    );

    // расширяем индекс аватарок
    // внутри одного пользователя аватарки отсортированы по дате загрузки теперь
    await sequelize.query(
        `CREATE INDEX avatars_user_id_created_at_active
             ON avatars ("userId", "createdAt", id)
             INCLUDE ("fileName")
             WHERE "deletedAt" IS NULL`,
        { transaction },
    );

    // новый индекс покрывает старый, поэтому он нам больше не нужен
    // удаляем этот индекс в конце, потому что при удалении индекса таблица
    // лочится до коммита транзакции
    await queryInterface.removeIndex("avatars", "avatars_user_id_active", {
        transaction,
    });
};
export const down: MigrationFn<MigrationContext> = async ({
    context: { queryInterface, transaction },
}) => {
    const { sequelize } = queryInterface;

    await sequelize.query(
        `CREATE INDEX avatars_user_id_active
             ON avatars ("userId")
             WHERE "deletedAt" IS NULL`,
        { transaction },
    );

    await queryInterface.removeIndex(
        "avatars",
        "avatars_user_id_created_at_active",
        { transaction },
    );

    await queryInterface.removeIndex(
        "users",
        "users_age_active_with_description",
        {
            transaction,
        },
    );
};
