import { Module } from "@nestjs/common";

import { WsAuthService } from "@notification-service/auth/ws-auth.service";

@Module({
    providers: [WsAuthService],
    exports: [WsAuthService],
})
export class AuthModule {}
