import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { SendNotificationDto } from "@notification-service/features/notification/dto/send-notification.dto";
import { UserNotification } from "@notification-service/features/notification/notification.events";
import { NotificationService } from "@notification-service/features/notification/notification.service";

// временный контроллер для ручной проверки
// TODO: уведомления должны приходить из kafka
@Controller("notifications")
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    send(@Body() dto: SendNotificationDto): UserNotification {
        return this.notificationService.notify(dto.userId, dto.message);
    }
}
