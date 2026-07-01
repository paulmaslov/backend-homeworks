import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserService } from "./user.service";
import { AccessTokenGuard } from "@/auth/guards/access-token.guard";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { UserResponseDto } from "./dto/user-response.dto";

@Controller("profile")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @UseGuards(AccessTokenGuard)
    @Get("my")
    async getMyProfile(
        @CurrentUser("userId") userId: string,
    ): Promise<UserResponseDto> {
        const user = await this.userService.findByIdOrFail(userId);
        return new UserResponseDto(user);
    }
}
