import { randomUUID } from "node:crypto";

import { TransferCompletedEvent } from "@libs/contracts";

// у каждого события свои пользователи
// между ними не нужно чистить kafka и mongo
export function buildTransferEvent(
    overrides: Partial<TransferCompletedEvent> = {},
): TransferCompletedEvent {
    return {
        eventId: randomUUID(),
        transferId: randomUUID(),
        fromUserId: randomUUID(),
        toUserId: randomUUID(),
        amount: "40.00",
        occurredAt: new Date().toISOString(),
        ...overrides,
    };
}
