import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";

import { KafkaHealthModule } from "@libs/common";

import { HealthController } from "@notification-service/health/health.controller";
import { KafkaConsumerWatcher } from "@notification-service/health/kafka-consumer.watcher";

@Module({
    imports: [
        TerminusModule,
        KafkaHealthModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                clientId: "notification-service-health",
                brokers: config.getOrThrow<string[]>("kafka.brokers"),
            }),
        }),
    ],
    controllers: [HealthController],
    providers: [KafkaConsumerWatcher],
})
export class HealthModule {}
