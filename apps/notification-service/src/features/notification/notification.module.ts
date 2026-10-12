import { Module } from "@nestjs/common";

import { AuthModule } from "@notification-service/auth/auth.module";

import { NotificationGateway } from "./notification.gateway";

@Module({
    imports: [AuthModule],
    providers: [NotificationGateway],
})
export class NotificationModule {}
