import type { MigrationFn } from "umzug";

import { MigrationContext } from "@notification-service/databases/migration.context";

const NOTIFICATIONS = "notifications";
const USER_EVENT_INDEX = "userId_1_eventId_1";

// создаем уникальный индекс по айди пользователя и айди сообщения,
// чтобы обеспечить идемпотентность консьюмера
export const up: MigrationFn<MigrationContext> = async ({
    context: { db },
}) => {
    await db
        .collection(NOTIFICATIONS)
        .createIndex(
            { userId: 1, eventId: 1 },
            { name: USER_EVENT_INDEX, unique: true },
        );
};

export const down: MigrationFn<MigrationContext> = async ({
    context: { db },
}) => {
    await db.collection(NOTIFICATIONS).dropIndex(USER_EVENT_INDEX);
};
