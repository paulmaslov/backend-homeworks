import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";

import { JWT_ACCESS_ALGORITHM } from "@libs/contracts";

import { UsersModule } from "@user-service/features/users/users.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RefreshTokenModule } from "./refresh-token.module";

@Module({
    imports: [
        UsersModule,
        RefreshTokenModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                privateKey: config.getOrThrow<string>("jwt.accessPrivateKey"),
                signOptions: {
                    algorithm: JWT_ACCESS_ALGORITHM,
                    expiresIn: config.get<string>("jwt.accessExpiresIn"),
                } as JwtSignOptions,
            }),
        }),
    ],
    providers: [AuthService],
    controllers: [AuthController],
})
export class AuthModule {}
