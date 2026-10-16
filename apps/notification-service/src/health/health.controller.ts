import {
    Controller,
    Get,
    ServiceUnavailableException,
    UseFilters,
    VERSION_NEUTRAL,
} from "@nestjs/common";
import {
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
} from "@nestjs/swagger";
import {
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    MongooseHealthIndicator,
} from "@nestjs/terminus";

import {
    HEALTH_CHECK_TIMEOUT_MS,
    HEALTH_PATH,
    HealthCheckFilter,
    KafkaHealthIndicator,
} from "@libs/common";

import { KafkaConsumerWatcher } from "@notification-service/health/kafka-consumer.watcher";

@ApiTags("health")
@UseFilters(HealthCheckFilter)
@Controller({ path: HEALTH_PATH, version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly mongodb: MongooseHealthIndicator,
        private readonly kafka: KafkaHealthIndicator,
        private readonly consumerWatcher: KafkaConsumerWatcher,
    ) {}

    @ApiOperation({ summary: "Liveness probe" })
    @ApiOkResponse({ description: "The process is alive" })
    @ApiServiceUnavailableResponse({
        description:
            "Kafka consumer has stopped for good, the pod has to be restarted",
    })
    @Get("live")
    live(): { status: "ok" } {
        const stopReason = this.consumerWatcher.getStopReason();

        if (stopReason !== undefined) {
            throw new ServiceUnavailableException({
                status: "error",
                message: `Kafka consumer has stopped: ${stopReason}`,
            });
        }

        return { status: "ok" };
    }

    @ApiOperation({ summary: "Readiness probe" })
    @HealthCheck()
    @Get("ready")
    ready(): Promise<HealthCheckResult> {
        return this.health.check([
            () =>
                this.mongodb
                    .pingCheck("mongodb")
                    .withTimeout(HEALTH_CHECK_TIMEOUT_MS),
            () => this.kafka.check("kafka"),
        ]);
    }
}
