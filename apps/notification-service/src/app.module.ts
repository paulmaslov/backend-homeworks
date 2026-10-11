import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import { ConfigsModule } from "@notification-service/configs/config.module";
import { buildLoggerOptions } from "@notification-service/providers/logger/logger-options";

@Module({
    imports: [
        ConfigsModule,
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: buildLoggerOptions,
        }),
    ],
})
export class AppModule {}
