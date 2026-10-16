import { Controller, Get, UseFilters, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
    HealthCheck,
    HealthCheckResult,
    HealthCheckService,
    SequelizeHealthIndicator,
} from "@nestjs/terminus";
import { SkipThrottle } from "@nestjs/throttler";

import {
    HEALTH_CHECK_TIMEOUT_MS,
    HEALTH_PATH,
    HealthCheckFilter,
    KafkaHealthIndicator,
} from "@libs/common";

@ApiTags("health")
@SkipThrottle()
@UseFilters(HealthCheckFilter)
@Controller({ path: HEALTH_PATH, version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly health: HealthCheckService,
        private readonly postgres: SequelizeHealthIndicator,
        private readonly kafka: KafkaHealthIndicator,
    ) {}

    @ApiOperation({ summary: "Liveness probe" })
    @ApiOkResponse({ description: "The process is alive" })
    @Get("live")
    live(): { status: "ok" } {
        return { status: "ok" };
    }

    @ApiOperation({ summary: "Readiness probe" })
    @HealthCheck()
    @Get("ready")
    ready(): Promise<HealthCheckResult> {
        return this.health.check([
            () =>
                this.postgres
                    .pingCheck("postgres")
                    .withTimeout(HEALTH_CHECK_TIMEOUT_MS),
            () => this.kafka.check("kafka"),
        ]);
    }
}
