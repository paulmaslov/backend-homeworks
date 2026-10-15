import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Schema as MongooseSchema, Types } from "mongoose";

import {
    NOTIFICATION_TYPES,
    NotificationType,
} from "@notification-service/features/notification/notification.events";

// поля, которые зависят от типа уведомления: у будущих типов
// (например, пополнения) будет свой набор
@Schema({ _id: false })
export class TransferNotificationData {
    @Prop({ required: true })
    transferId: string;

    @Prop({ required: true })
    fromUserId: string;

    @Prop({ required: true })
    toUserId: string;

    @Prop({ type: MongooseSchema.Types.Decimal128, required: true })
    amount: Types.Decimal128;
}

const TransferNotificationDataSchema = SchemaFactory.createForClass(
    TransferNotificationData,
);

// уведомление в ленте одного пользователя: перевод a -> b дает два документа,
// у отправителя и у получателя
@Schema({
    collection: "notifications",
    timestamps: { createdAt: true, updatedAt: false },
    // отключаем версионирование, тк храним уведомления только как историю
    versionKey: false,
})
export class NotificationRecord {
    // кому показываем уведомление
    @Prop({ required: true })
    userId: string;

    @Prop({ required: true })
    eventId: string;

    @Prop({
        type: String,
        required: true,
        enum: Object.values(NOTIFICATION_TYPES),
    })
    type: NotificationType;

    @Prop({ required: true })
    occurredAt: Date;

    @Prop({ type: TransferNotificationDataSchema, required: true })
    data: TransferNotificationData;

    createdAt: Date;
}

export const NotificationRecordSchema =
    SchemaFactory.createForClass(NotificationRecord);

// индекс создает миграция, тут мы проверяем наличие этого индекса
NotificationRecordSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// лента пользователя для истории уведомлений, от новых к старым
NotificationRecordSchema.index({ userId: 1, createdAt: -1, _id: -1 });
