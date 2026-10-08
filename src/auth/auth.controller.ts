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
import { ConfigService } from "@nestjs/config";
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCookieAuth,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import type { StringValue } from "ms";
import ms from "ms";

import { ApiCommonResponses } from "@/auth/decorators/api-common-responses.decorator";
import { AccessTokenResponseDto } from "@/auth/dto/access-token-response.dto";
import { ErrorResponseDto } from "@/common/dto/error-response.dto";
import { CreateUserDto } from "@/features/users/dto/create-user.dto";

import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from "./auth.constants";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

const REFRESH_COOKIE_HEADERS = {
    "Set-Cookie": {
        description: `httpOnly ${REFRESH_COOKIE} cookie scoped to ${REFRESH_COOKIE_PATH}`,
        schema: { type: "string" },
    },
};

@ApiTags("auth")
@ApiCommonResponses()
@Controller("auth")
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly config: ConfigService,
    ) {}

    @ApiOperation({ summary: "Register a new user and issue tokens" })
    @ApiCreatedResponse({
        type: AccessTokenResponseDto,
        headers: REFRESH_COOKIE_HEADERS,
    })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Validation failed",
    })
    @ApiConflictResponse({
        type: ErrorResponseDto,
        description: "Login or email already taken",
    })
    @Post("register")
    async register(
        @Body() dto: CreateUserDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<AccessTokenResponseDto> {
        const { accessToken, refreshToken } =
            await this.authService.register(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken };
    }

    @ApiOperation({ summary: "Authenticate by login and password" })
    @ApiOkResponse({
        type: AccessTokenResponseDto,
        headers: REFRESH_COOKIE_HEADERS,
    })
    @ApiBadRequestResponse({
        type: ErrorResponseDto,
        description: "Validation failed",
    })
    @ApiUnauthorizedResponse({
        type: ErrorResponseDto,
        description: "Invalid login or password",
    })
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

    @ApiOperation({ summary: "Rotate tokens using the refresh cookie" })
    @ApiCookieAuth()
    @ApiOkResponse({
        type: AccessTokenResponseDto,
        headers: REFRESH_COOKIE_HEADERS,
    })
    @ApiUnauthorizedResponse({
        type: ErrorResponseDto,
        description: "Missing or invalid refresh token",
    })
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

    @ApiOperation({ summary: "Revoke the refresh token and clear the cookie" })
    @ApiCookieAuth(REFRESH_COOKIE)
    @ApiNoContentResponse({ description: "Logged out" })
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
}
