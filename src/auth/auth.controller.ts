import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CreateUserDto } from "@/features/users/dto/create-user.dto";
import { LoginDto } from "./dto/login.dto";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import ms from "ms";
import type { StringValue } from "ms";
import { AccessTokenResponseDto } from "@/auth/dto/access-token-response.dto";
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "./auth.constants";

@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    private setRefreshCookie(res: Response, token: string): void {
        res.cookie(REFRESH_COOKIE, token, {
            httpOnly: true,
            secure: this.config.get<boolean>("isProduction"),
            sameSite: "strict",
            path: REFRESH_COOKIE_PATH,
            maxAge: ms(
                this.config.getOrThrow<string>(
                    "jwt.refreshExpiresIn",
                ) as StringValue,
            ),
        });
    }

    @Post("register")
    @HttpCode(HttpStatus.CREATED)
    async register(
        @Body() dto: CreateUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AccessTokenResponseDto> {
        const { accessToken, refreshToken } =
            await this.authService.register(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Post("login")
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AccessTokenResponseDto> {
        const { accessToken, refreshToken } = await this.authService.login(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AccessTokenResponseDto> {
        const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
        if (!raw) throw new UnauthorizedException("No refresh token");

        const { accessToken, refreshToken } =
            await this.authService.refresh(raw);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @Post("logout")
    @HttpCode(HttpStatus.NO_CONTENT)
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
        if (raw) await this.authService.logout(raw);
        res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    }
}
