import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Query,
    Res,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Response } from "express";

import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "@/auth/auth.constants";
import { ApiCommonResponses } from "@/auth/decorators/api-common-responses.decorator";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { ApiPaginatedResponse } from "@/common/decorators/api-paginated-response.decorator";
import { ErrorResponseDto } from "@/common/dto/error-response.dto";
import { PaginatedDto } from "@/common/dto/paginated.dto";
import { AgeRangePipe } from "@/common/pipes/age-range.pipe";
import { ActiveUserService } from "@/features/users/active-user.service";
import { ActiveUsersPageResponseDto } from "@/features/users/dto/active-user-response.dto";
import { ListActiveUsersQueryDto } from "@/features/users/dto/list-active-users.dto";
import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";
import { UpdateUserDto } from "@/features/users/dto/update-user.dto";

import { UserResponseDto } from "./dto/user-response.dto";
import { UserService } from "./user.service";

@ApiTags("users")
@ApiBearerAuth()
@ApiCommonResponses()
@ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: "Not authenticated",
})
@UseGuards(AccessTokenGuard)
@Controller("users")
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly activeUserService: ActiveUserService,
    ) {}

    @ApiOperation({ summary: "Get the authenticated user's profile" })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: "User not found",
    })
    @Get("me")
    async getMyProfile(
        @CurrentUser("userId") userId: string,
    ): Promise<UserResponseDto> {
        return await this.userService.getProfile(userId);
    }

    @ApiOperation({ summary: "Update the authenticated user's profile" })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Validation failed",
    })
    @ApiConflictResponse({
        type: ErrorResponseDto,
        description: "Login or email already taken",
    })
    @ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: "User not found",
    })
    @Patch("me")
    async updateMe(
        @CurrentUser("userId") userId: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(userId, dto);
    }

    @ApiOperation({ summary: "Soft-delete the authenticated user's account" })
    @ApiNoContentResponse({ description: "Account deleted" })
    @ApiNotFoundResponse({
        type: ErrorResponseDto,
        description: "User not found",
    })
    @Delete("me")
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeMe(
        @CurrentUser("userId") userId: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        await this.userService.remove(userId);
        res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    }

    @ApiOperation({ summary: "List users with pagination and login search" })
    @ApiPaginatedResponse(UserResponseDto)
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Invalid pagination or search params",
    })
    @Get()
    async findAll(
        @Query() query: ListUsersQueryDto,
    ): Promise<PaginatedDto<UserResponseDto>> {
        return this.userService.findAll(query);
    }

    @ApiOperation({ summary: "List the most active users" })
    @ApiOkResponse({ type: ActiveUsersPageResponseDto })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Invalid query params or cursor, or the query timed out",
    })
    @Get("active")
    async findActive(
        @Query(AgeRangePipe) query: ListActiveUsersQueryDto,
    ): Promise<ActiveUsersPageResponseDto> {
        return this.activeUserService.findActive(query);
    }
}
