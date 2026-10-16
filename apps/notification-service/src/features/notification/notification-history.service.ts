import { Injectable } from "@nestjs/common";

import { ListNotificationsQueryDto } from "@notification-service/features/notification/dto/list-notifications-query.dto";
import { NotificationsPageResponseDto } from "@notification-service/features/notification/dto/notification-response.dto";
import { INotificationRepository } from "@notification-service/features/notification/notification.repository.interface";
import {
    decodeNotificationCursor,
    encodeNotificationCursor,
} from "@notification-service/features/notification/notification-cursor";

@Injectable()
export class NotificationHistoryService {
    constructor(
        private readonly notificationRepository: INotificationRepository,
    ) {}

    async list(
        userId: string,
        query: ListNotificationsQueryDto,
    ): Promise<NotificationsPageResponseDto> {
        const cursor = query.cursor
            ? decodeNotificationCursor(query.cursor)
            : undefined;

        const page = await this.notificationRepository.findPage({
            userId,
            limit: query.limit,
            olderThan: cursor
                ? { createdAt: new Date(cursor.createdAt), id: cursor.id }
                : undefined,
        });

        const nextCursor = page.next
            ? encodeNotificationCursor({
                  createdAt: page.next.createdAt.toISOString(),
                  id: page.next.id,
              })
            : null;

        return new NotificationsPageResponseDto(page.notifications, nextCursor);
    }
}
