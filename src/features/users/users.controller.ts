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
import { UserService } from "./user.service";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { UserResponseDto } from "./dto/user-response.dto";
import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";
import { PaginatedDto } from "@/common/dto/paginated.dto";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { UpdateUserDto } from "@/features/users/dto/update-user.dto";
import { Response } from "express";
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "@/auth/auth.constants";
import {
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ApiPaginatedResponse } from "@/common/decorators/api-paginated-response.decorator";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller("users")
export class UsersController {
    constructor(private readonly userService: UserService) {}

    @ApiOperation({ summary: "Get the authenticated user's profile" })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiUnauthorizedResponse({ description: "Not authenticated" })
    @ApiNotFoundResponse({ description: "User not found" })
    @Get("me")
    async getMyProfile(
        @CurrentUser("userId") userId: string,
    ): Promise<UserResponseDto> {
        const user = await this.userService.findByIdOrFail(userId);
        return new UserResponseDto(user);
    }

    @ApiOperation({ summary: "Update the authenticated user's profile" })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiConflictResponse({ description: "Login or email already taken" })
    @ApiNotFoundResponse({ description: "User not found" })
    @Patch("me")
    async updateMe(
        @CurrentUser("userId") userId: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(userId, dto);
    }

    @ApiOperation({ summary: "Soft-delete the authenticated user's account" })
    @ApiNoContentResponse({ description: "Account deleted" })
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
    @Get()
    async findAll(
        @Query() query: ListUsersQueryDto,
    ): Promise<PaginatedDto<UserResponseDto>> {
        return this.userService.findAll(query);
    }
}
