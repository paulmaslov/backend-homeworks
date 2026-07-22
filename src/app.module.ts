import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
import { ConfigsModule } from "./configs/config.module";
import { UsersModule } from "./features/users/users.module";
import { PostgresqlModule } from "./providers/databases/postgresql/postgresql.module";

@Module({
    imports: [
        ConfigsModule,
        PostgresqlModule,
        UsersModule,
        AuthModule,
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
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
