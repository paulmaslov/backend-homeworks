import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Patch,
    Query,
    UseGuards,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { UserResponseDto } from "./dto/user-response.dto";
import { ListUsersQueryDto } from "@/features/users/dto/list-users-query.dto";
import { PaginatedDto } from "@/common/dto/paginated.dto";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { UpdateUserDto } from "@/features/users/dto/update-user.dto";

@UseGuards(AccessTokenGuard)
@Controller("users")
export class UsersController {
    constructor(private readonly userService: UserService) {}

    @Get("me")
    async getMyProfile(
        @CurrentUser("userId") userId: string,
    ): Promise<UserResponseDto> {
        const user = await this.userService.findByIdOrFail(userId);
        return new UserResponseDto(user);
    }

    @Patch("me")
    async updateMe(
        @CurrentUser("userId") userId: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(userId, dto);
    }

    @Delete("me")
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeMe(@CurrentUser("userId") userId: string): Promise<void> {
        return this.userService.remove(userId);
    }

    @Get()
    async findAll(
        @Query() query: ListUsersQueryDto,
    ): Promise<PaginatedDto<UserResponseDto>> {
        return this.userService.findAll(query);
    }
}
