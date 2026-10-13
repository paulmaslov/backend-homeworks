import { Injectable } from "@nestjs/common";

import { TransferCompletedEvent } from "@libs/contracts";

import {
    NOTIFICATION_TYPES,
    UserNotification,
} from "@notification-service/features/notification/notification.events";

import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
    constructor(private readonly gateway: NotificationGateway) {}

    notifyTransferCompleted(event: TransferCompletedEvent): void {
        const transfer: Omit<UserNotification, "type"> = {
            id: event.eventId,
            transferId: event.transferId,
            fromUserId: event.fromUserId,
            toUserId: event.toUserId,
            amount: event.amount,
            occurredAt: event.occurredAt,
        };

        this.gateway.sendNotification(event.fromUserId, {
            ...transfer,
            type: NOTIFICATION_TYPES.TRANSFER_SENT,
        });
        this.gateway.sendNotification(event.toUserId, {
            ...transfer,
            type: NOTIFICATION_TYPES.TRANSFER_RECEIVED,
        });
    }
}
