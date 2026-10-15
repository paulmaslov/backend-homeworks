import { ApiProperty } from "@nestjs/swagger";

import {
    NOTIFICATION_TYPES,
    NotificationType,
    UserNotification,
} from "@notification-service/features/notification/notification.events";

// то же уведомление, что приходит в сокет событием notification
export class NotificationResponseDto implements UserNotification {
    @ApiProperty({
        format: "uuid",
        description: "Event id, the same as in the socket notification event",
    })
    readonly id: string;

    @ApiProperty({ enum: Object.values(NOTIFICATION_TYPES) })
    readonly type: NotificationType;

    @ApiProperty({ format: "uuid" })
    readonly transferId: string;

    @ApiProperty({ format: "uuid" })
    readonly fromUserId: string;

    @ApiProperty({ format: "uuid" })
    readonly toUserId: string;

    @ApiProperty({ example: "40.00" })
    readonly amount: string;

    @ApiProperty({ format: "date-time" })
    readonly occurredAt: string;
}

export class NotificationsPageResponseDto {
    @ApiProperty({ type: [NotificationResponseDto] })
    readonly data: NotificationResponseDto[];

    // null означает, что это последняя страница
    @ApiProperty({
        type: String,
        nullable: true,
        description: "Next page token, null means this is the last page",
        example:
            "eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTE0VDEyOjAwOjAwLjAwMFoiLCJpZCI6IjY3MTBhMWIyYzNkNGU1ZjZhN2I4YzlkMCJ9",
    })
    readonly nextCursor: string | null;

    constructor(data: NotificationResponseDto[], nextCursor: string | null) {
        this.data = data;
        this.nextCursor = nextCursor;
    }
}
