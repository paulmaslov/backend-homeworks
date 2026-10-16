import type { MigrationFn } from "umzug";

import { MigrationContext } from "@notification-service/databases/migration.context";

const NOTIFICATIONS = "notifications";
const USER_FEED_INDEX = "userId_1_createdAt_-1__id_-1";

// уведомления пользователя от новых к старым. _id нужен, чтобы
// порядок был однозначным, когда у двух уведомлений одинаковый createdAt
export const up: MigrationFn<MigrationContext> = async ({
    context: { db },
}) => {
    await db
        .collection(NOTIFICATIONS)
        .createIndex(
            { userId: 1, createdAt: -1, _id: -1 },
            { name: USER_FEED_INDEX },
        );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { db },
}) => {
    await db.collection(NOTIFICATIONS).dropIndex(USER_FEED_INDEX);
};
