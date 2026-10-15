import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";

import { KafkaHealthModule } from "@libs/common";

import { HealthController } from "@user-service/health/health.controller";

@Module({
    imports: [
        TerminusModule,
        KafkaHealthModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                clientId: "user-service-health",
                brokers: config.getOrThrow<string[]>("kafka.brokers"),
            }),
        }),
    ],
    controllers: [HealthController],
})
export class HealthModule {}
