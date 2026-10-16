import { Injectable } from "@nestjs/common";

import { TransferCompletedEvent } from "@libs/contracts";

import {
    NOTIFICATION_TYPES,
    UserNotification,
} from "@notification-service/features/notification/notification.events";
import { INotificationRepository } from "@notification-service/features/notification/notification.repository.interface";

import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
    constructor(
        private readonly gateway: NotificationGateway,
        private readonly notificationRepository: INotificationRepository,
    ) {}

    // сначала сохраняем, потом отправляем, чтобы в сокет не ушло то, чего нет в
    // истории, если событие пришло повторно, в бд дубля не будет, но пуш
    // отправляем снова, тк сервер не знает, успел ли он отправить его в прошлый раз.
    // повторное уведомление клиент должен отфильтровать по id
    async notifyTransferCompleted(
        event: TransferCompletedEvent,
    ): Promise<void> {
        const transfer: Omit<UserNotification, "type"> = {
            id: event.eventId,
            transferId: event.transferId,
            fromUserId: event.fromUserId,
            toUserId: event.toUserId,
            amount: event.amount,
            occurredAt: event.occurredAt,
        };

        const sent: UserNotification = {
            ...transfer,
            type: NOTIFICATION_TYPES.TRANSFER_SENT,
        };
        const received: UserNotification = {
            ...transfer,
            type: NOTIFICATION_TYPES.TRANSFER_RECEIVED,
        };

        await this.notificationRepository.add({
            userId: event.fromUserId,
            notification: sent,
        });
        await this.notificationRepository.add({
            userId: event.toUserId,
            notification: received,
        });

        this.gateway.sendNotification(event.fromUserId, sent);
        this.gateway.sendNotification(event.toUserId, received);
    }
}
