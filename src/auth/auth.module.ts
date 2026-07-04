import { Module } from "@nestjs/common";
import { UsersModule } from "@/features/users/users.module";
import { RefreshTokenModule } from "./refresh-token.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AccessTokenStrategy } from "./strategies/access-token.strategy";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

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
