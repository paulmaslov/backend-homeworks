import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/sequelize";

import { OutboxEvent } from "@user-service/providers/outbox/outbox-event.model";

export function findOutboxEvents(
    app: INestApplication,
): Promise<OutboxEvent[]> {
    return app
        .get<typeof OutboxEvent>(getModelToken(OutboxEvent))
        .findAll({ raw: true });
}
