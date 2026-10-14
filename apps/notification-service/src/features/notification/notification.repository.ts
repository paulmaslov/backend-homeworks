import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, mongo, Types } from "mongoose";

import {
    AddNotificationData,
    INotificationRepository,
} from "@notification-service/features/notification/notification.repository.interface";
import { NotificationRecord } from "@notification-service/features/notification/notification.schema";

const DUPLICATE_KEY_ERROR_CODE = 11000;

@Injectable()
export class NotificationRepository
    implements INotificationRepository, OnModuleInit
{
    constructor(
        @InjectModel(NotificationRecord.name)
        private readonly notificationModel: Model<NotificationRecord>,
    ) {}

    // индексы создают миграции. без уникального индекса сервис молча сохранял
    // бы дубли, поэтому не стартуем, пока миграции не применены. лишние индексы
    // не мешают: их могла создать миграция более новой версии сервиса
    async onModuleInit(): Promise<void> {
        const { toCreate } = await this.notificationModel.diffIndexes();

        if (toCreate.length > 0) {
            throw new Error(
                `MongoDB indexes are missing: ${JSON.stringify(toCreate)}. ` +
                    "Run migration:notification:up",
            );
        }
    }

    async add({ userId, notification }: AddNotificationData): Promise<void> {
        try {
            await this.notificationModel.create({
                userId,
                eventId: notification.id,
                type: notification.type,
                occurredAt: new Date(notification.occurredAt),
                data: {
                    transferId: notification.transferId,
                    fromUserId: notification.fromUserId,
                    toUserId: notification.toUserId,
                    amount: Types.Decimal128.fromString(notification.amount),
                },
            });
        } catch (error) {
            if (!isDuplicateKey(error)) {
                throw error;
            }
        }
    }
}

// уведомление уже сохранено при прошлой доставке события
function isDuplicateKey(error: unknown): boolean {
    return (
        error instanceof mongo.MongoServerError &&
        error.code === DUPLICATE_KEY_ERROR_CODE
    );
}
