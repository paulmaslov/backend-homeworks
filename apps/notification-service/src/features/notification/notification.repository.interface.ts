import { UserNotification } from "@notification-service/features/notification/notification.events";

export interface AddNotificationData {
    // кому показываем уведомление
    readonly userId: string;
    readonly notification: UserNotification;
}

export interface NotificationPosition {
    readonly createdAt: Date;
    readonly id: string;
}

export interface FindNotificationsParams {
    readonly userId: string;
    readonly limit: number;
    readonly olderThan?: NotificationPosition;
}

export interface NotificationsPage {
    readonly notifications: UserNotification[];
    // позиция последнего уведомления страницы, null - дальше уведомлений нет
    readonly next: NotificationPosition | null;
}

export abstract class INotificationRepository {
    abstract add(data: AddNotificationData): Promise<void>;

    // уведомления пользователя от новых к старым
    abstract findPage(
        params: FindNotificationsParams,
    ): Promise<NotificationsPage>;
}
