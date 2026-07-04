import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PostgresqlModule } from "./providers/databases/postgresql/postgresql.module";
import { ConfigsModule } from "./configs/config.module";
import { UsersModule } from "./features/users/users.module";
import { AuthModule } from "./auth/auth.module";

// 10 запросов в минуту
const RATE_LIMITER_TIME_INTERVAL_MS = 60000;
const RATE_LIMITER_REQUESTS_COUNT = 10;

@Module({
    imports: [
        ConfigsModule,
        PostgresqlModule,
        UsersModule,
        AuthModule,
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    ttl: RATE_LIMITER_TIME_INTERVAL_MS,
                    limit: RATE_LIMITER_REQUESTS_COUNT,
                },
            ],
        }),
    ],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
