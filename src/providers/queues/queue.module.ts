import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
    imports: [
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: {
                    host: config.getOrThrow<string>("redis.host"),
                    port: config.getOrThrow<number>("redis.port"),
                    password: config.getOrThrow<string>("redis.password"),
                },
            }),
        }),
    ],
})
export class QueuesModule {}
