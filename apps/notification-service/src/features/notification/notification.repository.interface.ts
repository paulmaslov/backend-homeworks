import { UserNotification } from "@notification-service/features/notification/notification.events";

export interface AddNotificationData {
    // кому показываем уведомление
    readonly userId: string;
    readonly notification: UserNotification;
}

export abstract class INotificationRepository {
    abstract add(data: AddNotificationData): Promise<void>;
}
