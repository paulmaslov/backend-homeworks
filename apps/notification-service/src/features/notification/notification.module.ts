import { Module } from "@nestjs/common";

import { AuthModule } from "@notification-service/auth/auth.module";
import { NotificationController } from "@notification-service/features/notification/notification.controller";
import { NotificationService } from "@notification-service/features/notification/notification.service";

import { NotificationGateway } from "./notification.gateway";

@Module({
    imports: [AuthModule],
    controllers: [NotificationController],
    providers: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
