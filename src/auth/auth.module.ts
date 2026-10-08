import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { UsersModule } from "@/features/users/users.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RefreshTokenModule } from "./refresh-token.module";
import { AccessTokenStrategy } from "./strategies/access-token.strategy";

@Module({
    imports: [
        UsersModule,
        RefreshTokenModule,
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
    providers: [AccessTokenStrategy, AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
