import { createKeyv } from "@keyv/redis";
import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

// если забыли передать в set() ttl
const FALLBACK_TTL_MS = 60_000;

// TODO: поресерчить над тем, как делать модуль и подключать редис
@Module({
    imports: [
        CacheModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                stores: [
                    createKeyv(buildRedisUrl(config), {
                        namespace: "cache",
                    }),
                ],
                ttl: FALLBACK_TTL_MS,
            }),
        }),
    ],
    exports: [CacheModule],
})
export class RedisCacheModule {}

function buildRedisUrl(config: ConfigService): string {
    const host = config.getOrThrow<string>("redis.host");
    const port = config.getOrThrow<number>("redis.port");
    const password = config.getOrThrow<string>("redis.password");

    // пользователя нет, поэтому пароль идёт сразу после redis://:
    return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
}
