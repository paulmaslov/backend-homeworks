import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "@/features/users/dto/create-user.dto";
import { AuthTokensResponseDto } from "./dto/auth-tokens-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post("register")
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: CreateUserDto): Promise<AuthTokensResponseDto> {
        return this.authService.register(dto);
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<AuthTokensResponseDto> {
        return this.authService.login(dto);
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshDto): Promise<AuthTokensResponseDto> {
        return this.authService.refresh(dto.refresh_token);
    }

    @Post("logout")
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout(@Body() dto: RefreshDto): Promise<void> {
        return this.authService.logout(dto.refresh_token);
    }
}
