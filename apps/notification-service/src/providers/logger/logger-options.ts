import { ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";

import { buildLoggerParams } from "@libs/common";

export function buildLoggerOptions(config: ConfigService): Params {
    return buildLoggerParams({
        level: config.getOrThrow<string>("logging.level"),
        pretty: config.getOrThrow<boolean>("logging.pretty"),
        env: config.getOrThrow<string>("nodeEnv"),
    });
}
