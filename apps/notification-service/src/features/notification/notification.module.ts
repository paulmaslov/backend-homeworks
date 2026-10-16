import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "@notification-service/auth/auth.module";
import { NotificationController } from "@notification-service/features/notification/notification.controller";
import { NotificationRepository } from "@notification-service/features/notification/notification.repository";
import { INotificationRepository } from "@notification-service/features/notification/notification.repository.interface";
import {
    NotificationRecord,
    NotificationRecordSchema,
} from "@notification-service/features/notification/notification.schema";
import { NotificationService } from "@notification-service/features/notification/notification.service";
import { NotificationHistoryController } from "@notification-service/features/notification/notification-history.controller";
import { NotificationHistoryService } from "@notification-service/features/notification/notification-history.service";
import { MongoRetry } from "@notification-service/providers/databases/mongodb/mongo-retry";

import { NotificationGateway } from "./notification.gateway";

@Module({
    imports: [
        AuthModule,
        MongooseModule.forFeature([
            { name: NotificationRecord.name, schema: NotificationRecordSchema },
        ]),
    ],
    controllers: [NotificationController, NotificationHistoryController],
    providers: [
        NotificationGateway,
        NotificationService,
        NotificationHistoryService,
        { provide: INotificationRepository, useClass: NotificationRepository },
        MongoRetry,
    ],
})
export class NotificationModule {}
