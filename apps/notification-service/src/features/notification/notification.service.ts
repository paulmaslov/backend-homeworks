import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import { UserNotification } from "@notification-service/features/notification/notification.events";

import { NotificationGateway } from "./notification.gateway";

@Injectable()
export class NotificationService {
    constructor(private readonly gateway: NotificationGateway) {}

    notify(userId: string, message: string): UserNotification {
        const notification: UserNotification = {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            message,
        };

        this.gateway.sendNotification(userId, notification);

        return notification;
    }
}
