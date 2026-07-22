import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectConnection } from "@nestjs/sequelize";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import type { StringValue } from "ms";
import ms from "ms";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { CreateUserDto } from "@/features/users/dto/create-user.dto";
import { User } from "@/features/users/user.model";
import { UserService } from "@/features/users/user.service";

import { AuthTokensResponseDto } from "./dto/auth-tokens-response.dto";
import { LoginDto } from "./dto/login.dto";
import { IRefreshTokenRepository } from "./refresh-token.repository.interface";

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly refreshTokenRepository: IRefreshTokenRepository,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,

        @InjectConnection() private readonly sequelize: Sequelize,
    ) {}

    private signAccessToken(user: User): string {
        const payload: JwtPayload = {
            sub: user.id,
        };

        return this.jwtService.sign(payload);
    }

    private generateRefreshToken(): { raw: string; hash: string } {
        const raw = crypto.randomBytes(64).toString("hex");
        const hash = this.hashRefreshToken(raw);
        return { raw, hash };
    }

    private hashRefreshToken(raw: string): string {
        return crypto.createHash("sha256").update(raw).digest("hex");
    }

    private async issueRefreshToken(
        userId: string,
        transaction?: Transaction,
    ): Promise<string> {
        const { raw, hash } = this.generateRefreshToken();

        const refreshExpiresIn = this.config.getOrThrow<string>(
            "jwt.refreshExpiresIn",
        );
        const expiresAt = new Date(
            Date.now() + ms(refreshExpiresIn as StringValue),
        );

        await this.refreshTokenRepository.create(
            { tokenHash: hash, userId, expiresAt },
            transaction,
        );

        return raw;
    }

    private async issueTokenPair(
        user: User,
        transaction?: Transaction,
    ): Promise<AuthTokensResponseDto> {
        const accessToken = this.signAccessToken(user);
        const refreshToken = await this.issueRefreshToken(user.id, transaction);
        return { accessToken, refreshToken };
    }

    // Во время регистрации мы создаем пользователя и выдаем пару токенов
    // нам нужно создать юзера и рефреш токен атомарно
    async register(dto: CreateUserDto): Promise<AuthTokensResponseDto> {
        return this.sequelize.transaction(async (transaction) => {
            const user = await this.userService.create(dto, transaction);
            return this.issueTokenPair(user, transaction);
        });
    }

    async login(dto: LoginDto): Promise<AuthTokensResponseDto> {
        const user = await this.userService.findByLogin(dto.login);
        if (!user) {
            throw new UnauthorizedException("Invalid login or password");
        }

        const isPasswordValid = await argon2.verify(
            user.password,
            dto.password,
        );
        if (!isPasswordValid) {
            throw new UnauthorizedException("Invalid login or password");
        }

        return this.issueTokenPair(user);
    }

    // Удаление старого токено и создание нового должны быть атомарны - делаем это в транзакции
    async refresh(rawRefreshToken: string): Promise<AuthTokensResponseDto> {
        return this.sequelize.transaction(async (transaction) => {
            const tokenHash = this.hashRefreshToken(rawRefreshToken);

            const storedRefreshToken =
                await this.refreshTokenRepository.findByTokenHash(
                    tokenHash,
                    transaction,
                );

            if (!storedRefreshToken) {
                throw new UnauthorizedException("Invalid refresh token");
            }

            if (storedRefreshToken.expiresAt.getTime() < Date.now()) {
                await this.refreshTokenRepository.deleteByTokenHash(
                    tokenHash,
                    transaction,
                );
                throw new UnauthorizedException("Refresh token expired");
            }

            const user = await this.userService.findByIdOrFail(
                storedRefreshToken.userId,
            );

            await this.refreshTokenRepository.deleteByTokenHash(
                tokenHash,
                transaction,
            );

            return this.issueTokenPair(user, transaction);
        });
    }

    async logout(rawRefreshToken: string): Promise<void> {
        const tokenHash = this.hashRefreshToken(rawRefreshToken);
        await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
    }
}
