import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { AccessTokenGuard, CurrentUser, ErrorResponseDto } from "@libs/common";

import { ListNotificationsQueryDto } from "@notification-service/features/notification/dto/list-notifications-query.dto";
import { NotificationsPageResponseDto } from "@notification-service/features/notification/dto/notification-response.dto";
import { NotificationHistoryService } from "@notification-service/features/notification/notification-history.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller("notifications")
export class NotificationHistoryController {
    constructor(private readonly history: NotificationHistoryService) {}

    @ApiOperation({
        summary: "List notifications of the current user, newest first",
    })
    @ApiOkResponse({ type: NotificationsPageResponseDto })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Invalid query params or cursor",
    })
    @ApiUnauthorizedResponse({
        type: ErrorResponseDto,
        description:
            "Access token is missing, invalid or expired. The code field is TOKEN_INVALID or TOKEN_EXPIRED",
    })
    @Get()
    list(
        @CurrentUser("userId") userId: string,
        @Query() query: ListNotificationsQueryDto,
    ): Promise<NotificationsPageResponseDto> {
        return this.history.list(userId, query);
    }
}
