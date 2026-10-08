import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { AvatarsModule } from "@/features/avatars/avatars.module";
import { BalanceResetModule } from "@/features/balance-reset/balance-reset.module";
import { WalletModule } from "@/features/wallet/wallet.module";
import { buildLoggerOptions } from "@/providers/logger/logger-options";
import { QueuesModule } from "@/providers/queues/queue.module";

import { AuthModule } from "./auth/auth.module";
import { LoggerContextInterceptor } from "./common/interceptors/logger-context.interceptor";
import { ConfigsModule } from "./configs/config.module";
import { UsersModule } from "./features/users/users.module";
import { PostgresqlModule } from "./providers/databases/postgresql/postgresql.module";

@Module({
    imports: [
        ConfigsModule,
        // регистрировать только здесь, в корне. @InjectPinoLogger собирает
        // имена контекстов в момент загрузки файлов, а forRootAsync создаёт
        // провайдеры по этому списку один раз. В корневом модуле он вызывается
        // после завершения всех импортов - когда все имена уже собраны.
        // В отдельном модуле вызов происходит посреди цепочки импортов, и
        // сервисы из файлов ниже по списку остаются без провайдеров
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: buildLoggerOptions,
        }),
        PostgresqlModule,
        UsersModule,
        AuthModule,
        AvatarsModule,
        WalletModule,
        QueuesModule,
        BalanceResetModule,
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        ttl: config.getOrThrow<number>("rateLimit.periodMs"),
                        limit: config.getOrThrow<number>("rateLimit.requests"),
                    },
                ],
            }),
        }),
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: LoggerContextInterceptor },
    ],
})
export class AppModule {}
