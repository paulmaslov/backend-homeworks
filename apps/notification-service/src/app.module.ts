import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { AccessTokenModule } from "@libs/common";

import { ConfigsModule } from "@notification-service/configs/config.module";
import { NotificationModule } from "@notification-service/features/notification/notification.module";
import { HealthModule } from "@notification-service/health/health.module";
import { MongodbModule } from "@notification-service/providers/databases/mongodb/mongodb.module";
import { buildLoggerOptions } from "@notification-service/providers/logger/logger-options";

@Module({
    imports: [
        ConfigsModule,
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: buildLoggerOptions,
        }),
        AccessTokenModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                publicKey: config.getOrThrow<string>("jwt.accessPublicKey"),
            }),
        }),
        MongodbModule,
        NotificationModule,
        HealthModule,
    ],
})
export class AppModule {}
