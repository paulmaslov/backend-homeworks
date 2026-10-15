import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { KafkaHealthIndicator } from "./kafka-health.indicator";
import { KafkaHealthConfigurableModule } from "./kafka-health.module-definition";

@Module({
    imports: [TerminusModule],
    providers: [KafkaHealthIndicator],
    exports: [KafkaHealthIndicator],
})
export class KafkaHealthModule extends KafkaHealthConfigurableModule {}
