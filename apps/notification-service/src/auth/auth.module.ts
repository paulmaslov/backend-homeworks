import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { JWT_ACCESS_ALGORITHM } from "@libs/contracts";

import { WsAuthService } from "@notification-service/auth/ws-auth.service";

@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                publicKey: config.getOrThrow<string>("jwt.accessPublicKey"),
                verifyOptions: { algorithms: [JWT_ACCESS_ALGORITHM] },
            }),
        }),
    ],
    providers: [WsAuthService],
    exports: [WsAuthService],
})
export class AuthModule {}
