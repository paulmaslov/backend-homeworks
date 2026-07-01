import { Module } from "@nestjs/common";
import { UsersModule } from "@/features/users/users.module";
import { RefreshToken } from "./refresh-token.model";
import { SequelizeModule } from "@nestjs/sequelize";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IRefreshTokenRepository } from "./refresh-token.repository.interface";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { AccessTokenStrategy } from "./strategies/access-token.strategy";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

@Module({
    imports: [
        UsersModule,

        SequelizeModule.forFeature([RefreshToken]),

        PassportModule,

        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>("jwt.accessSecret"),
                signOptions: {
                    expiresIn: config.get<string>("jwt.accessExpiresIn"),
                } as JwtSignOptions,
            }),
        }),
    ],
    providers: [
        { provide: IRefreshTokenRepository, useClass: RefreshTokenRepository },
        AccessTokenStrategy,
        AuthService,
    ],
    controllers: [AuthController],
})
export class AuthModule {}
