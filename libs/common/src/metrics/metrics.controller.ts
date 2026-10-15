import { Controller, Get, Res, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { collectDefaultMetrics, register } from "@prometheus-io/client";
import type { Response } from "express";

import { METRICS_PATH } from "./metrics.constants";

// стандартные метрики node.js: cpu, память, задержка event loop, сборка мусора
collectDefaultMetrics();

// метрики читает prometheus, а не клиенты api, поэтому в swagger их нет
@ApiExcludeController()
@Controller({ path: METRICS_PATH, version: VERSION_NEUTRAL })
export class MetricsController {
    @Get()
    metrics(@Res({ passthrough: true }) response: Response): Promise<string> {
        response.contentType(register.contentType);
        return register.metrics();
    }
}
