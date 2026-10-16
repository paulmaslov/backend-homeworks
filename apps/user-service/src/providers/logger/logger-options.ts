import { ConfigService } from "@nestjs/config";
import { Params } from "nestjs-pino";

import { buildLoggerParams } from "@libs/common";

// не выносить в отдельный модуль - приложение не запустится: LoggerModule
// раздаёт логгеры один раз, когда все остальные модули уже подключены
export function buildLoggerOptions(config: ConfigService): Params {
    return buildLoggerParams(
        {
            level: config.getOrThrow<string>("logging.level"),
            pretty: config.getOrThrow<boolean>("logging.pretty"),
            env: config.getOrThrow<string>("nodeEnv"),
        },
        {
            customProps: (req) => ({
                userId: (req as { user?: { userId: string } }).user?.userId,
            }),
        },
    );
}
