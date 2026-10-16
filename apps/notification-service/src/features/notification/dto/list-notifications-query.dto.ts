import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import {
    NOTIFICATIONS_DEFAULT_PAGE_LIMIT,
    NOTIFICATIONS_MAX_PAGE_LIMIT,
} from "@notification-service/features/notification/notification.constants";

export class ListNotificationsQueryDto {
    @ApiPropertyOptional({
        example: 20,
        default: NOTIFICATIONS_DEFAULT_PAGE_LIMIT,
        maximum: NOTIFICATIONS_MAX_PAGE_LIMIT,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(NOTIFICATIONS_MAX_PAGE_LIMIT)
    readonly limit: number = NOTIFICATIONS_DEFAULT_PAGE_LIMIT;

    @ApiPropertyOptional({
        description: "Next page token, taken from nextCursor",
    })
    @IsOptional()
    @IsString()
    readonly cursor?: string;
}
